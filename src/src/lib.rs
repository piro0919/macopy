use serde::{Deserialize, Serialize};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{
    image::Image,
    menu::{Menu, MenuBuilder, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, WebviewWindow,
};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_store::StoreExt;

#[cfg(target_os = "macos")]
use cocoa::base::{id, nil};
#[cfg(target_os = "macos")]
use cocoa::foundation::{NSAutoreleasePool, NSData};
#[cfg(target_os = "macos")]
use objc::{msg_send, sel, sel_impl};

const MAX_HISTORY_ITEMS: usize = 10;
const POPUP_WIDTH: f64 = 250.0;
const CLIPBOARD_POLL_INTERVAL_MS: u64 = 500;

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq)]
#[serde(tag = "type", content = "content")]
pub enum HistoryItem {
    #[serde(rename = "text")]
    Text(String),
    #[serde(rename = "image")]
    Image(String),
}

impl HistoryItem {
    fn to_frontend_format(&self) -> serde_json::Value {
        match self {
            HistoryItem::Text(content) => serde_json::json!({
                "type": "text",
                "content": content
            }),
            HistoryItem::Image(content) => serde_json::json!({
                "type": "image",
                "content": content
            }),
        }
    }
}

pub struct AppState {
    history: Mutex<Vec<HistoryItem>>,
    last_active_app: Mutex<String>,
    show_tray_icon: Mutex<bool>,
    current_shortcut: Mutex<String>,
    open_at_login: Mutex<bool>,
    tray_icon: Mutex<Option<TrayIcon>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            history: Mutex::new(Vec::new()),
            last_active_app: Mutex::new(String::new()),
            show_tray_icon: Mutex::new(true),
            current_shortcut: Mutex::new("Alt+V".to_string()),
            open_at_login: Mutex::new(false),
            tray_icon: Mutex::new(None),
        }
    }
}

fn get_frontmost_app() -> String {
    let script = r#"tell application "System Events" to get name of first application process whose frontmost is true"#;
    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output();

    match output {
        Ok(out) => String::from_utf8_lossy(&out.stdout).trim().to_string(),
        Err(_) => String::new(),
    }
}

fn execute_paste(app_name: &str) {
    // If no app name, just send paste command to frontmost app
    let script = if app_name.is_empty() {
        r#"
delay 0.1
tell application "System Events"
  keystroke "v" using {command down}
end tell
"#.to_string()
    } else {
        let escaped_name = app_name.replace('\\', "\\\\").replace('"', "\\\"");
        format!(
            r#"
tell application "{}"
  activate
end tell
delay 0.1
tell application "System Events"
  keystroke "v" using {{command down}}
end tell
"#,
            escaped_name
        )
    };

    // Use thread to avoid blocking, but still capture errors
    std::thread::spawn(move || {
        let result = Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .output();

        if let Err(e) = result {
            log::error!("Failed to execute paste script: {}", e);
        } else if let Ok(output) = result {
            if !output.status.success() {
                log::error!(
                    "Paste script failed: {}",
                    String::from_utf8_lossy(&output.stderr)
                );
            }
        }
    });
}

#[cfg(target_os = "macos")]
fn get_clipboard_change_count() -> i64 {
    unsafe {
        let pool = NSAutoreleasePool::new(nil);
        let pasteboard: id = msg_send![objc::class!(NSPasteboard), generalPasteboard];
        let count: i64 = msg_send![pasteboard, changeCount];
        let _: () = msg_send![pool, drain];
        count
    }
}

#[cfg(target_os = "macos")]
fn read_image_from_clipboard() -> Option<String> {
    unsafe {
        let pool = NSAutoreleasePool::new(nil);
        let pasteboard: id = msg_send![objc::class!(NSPasteboard), generalPasteboard];

        let png_type: id = msg_send![objc::class!(NSString), stringWithUTF8String:b"public.png\0".as_ptr()];
        let tiff_type: id = msg_send![objc::class!(NSString), stringWithUTF8String:b"public.tiff\0".as_ptr()];

        // Try PNG first
        let png_data: id = msg_send![pasteboard, dataForType: png_type];
        if png_data != nil {
            let length: usize = msg_send![png_data, length];
            let bytes: *const u8 = msg_send![png_data, bytes];
            let slice = std::slice::from_raw_parts(bytes, length);
            let base64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, slice);
            let _: () = msg_send![pool, drain];
            return Some(format!("data:image/png;base64,{}", base64));
        }

        // Try TIFF
        let tiff_data: id = msg_send![pasteboard, dataForType: tiff_type];
        if tiff_data != nil {
            // Convert TIFF to PNG using NSImage
            let image: id = msg_send![objc::class!(NSImage), alloc];
            let image: id = msg_send![image, initWithData: tiff_data];
            if image != nil {
                let tiff_rep: id = msg_send![image, TIFFRepresentation];
                if tiff_rep != nil {
                    let bitmap_rep: id = msg_send![objc::class!(NSBitmapImageRep), imageRepWithData: tiff_rep];
                    if bitmap_rep != nil {
                        let props: id = msg_send![objc::class!(NSDictionary), dictionary];
                        let png_data: id = msg_send![bitmap_rep, representationUsingType: 4u64 properties: props];
                        if png_data != nil {
                            let length: usize = msg_send![png_data, length];
                            let bytes: *const u8 = msg_send![png_data, bytes];
                            let slice = std::slice::from_raw_parts(bytes, length);
                            let base64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, slice);
                            let _: () = msg_send![pool, drain];
                            return Some(format!("data:image/png;base64,{}", base64));
                        }
                    }
                }
            }
        }

        let _: () = msg_send![pool, drain];
        None
    }
}

#[cfg(not(target_os = "macos"))]
fn get_clipboard_change_count() -> i64 {
    0
}

#[cfg(not(target_os = "macos"))]
fn read_image_from_clipboard() -> Option<String> {
    None
}

fn update_clipboard(app: &AppHandle, state: &AppState) -> bool {
    let clipboard = app.clipboard();
    let mut changed = false;

    // Try to read image first (higher priority)
    if let Some(image_data) = read_image_from_clipboard() {
        let mut history = state.history.lock().unwrap();
        let new_item = HistoryItem::Image(image_data.clone());

        if history.first() != Some(&new_item) {
            history.insert(0, new_item);
            if history.len() > MAX_HISTORY_ITEMS {
                history.pop();
            }
            changed = true;

            // Save to store
            if let Ok(store) = app.store("store.json") {
                let history_json: Vec<serde_json::Value> = history
                    .iter()
                    .map(|item| item.to_frontend_format())
                    .collect();
                let _ = store.set("history", serde_json::json!(history_json));
                let _ = store.save();
            }
        }
    } else if let Ok(text) = clipboard.read_text() {
        // Fall back to text
        if !text.is_empty() {
            let mut history = state.history.lock().unwrap();
            let new_item = HistoryItem::Text(text.clone());

            if history.first() != Some(&new_item) {
                history.insert(0, new_item);
                if history.len() > MAX_HISTORY_ITEMS {
                    history.pop();
                }
                changed = true;

                // Save to store
                if let Ok(store) = app.store("store.json") {
                    let history_json: Vec<serde_json::Value> = history
                        .iter()
                        .map(|item| item.to_frontend_format())
                        .collect();
                    let _ = store.set("history", serde_json::json!(history_json));
                    let _ = store.save();
                }
            }
        }
    }

    changed
}

fn send_history_to_frontend(app: &AppHandle, state: &AppState) {
    let history = state.history.lock().unwrap();
    let history_json: Vec<serde_json::Value> = history
        .iter()
        .map(|item| item.to_frontend_format())
        .collect();
    let _ = app.emit("clipboard-history", history_json);
}

#[cfg(target_os = "macos")]
fn set_window_alpha(window: &WebviewWindow, alpha: f64) {
    if let Ok(ns_window) = window.ns_window() {
        unsafe {
            let _: () = msg_send![ns_window as id, setAlphaValue: alpha];
        }
    }
}

#[cfg(not(target_os = "macos"))]
fn set_window_alpha(_window: &WebviewWindow, _alpha: f64) {}

#[cfg(target_os = "macos")]
fn get_cursor_position_native() -> (f64, f64) {
    unsafe {
        let pool = NSAutoreleasePool::new(nil);

        // Get mouse location in screen coordinates (bottom-left origin)
        let mouse_loc: cocoa::foundation::NSPoint = msg_send![objc::class!(NSEvent), mouseLocation];

        // Get the main screen height for coordinate conversion
        let screens: id = msg_send![objc::class!(NSScreen), screens];
        let main_screen: id = msg_send![screens, objectAtIndex: 0usize];
        let main_frame: cocoa::foundation::NSRect = msg_send![main_screen, frame];
        let screen_height = main_frame.size.height;

        // Convert from bottom-left origin to top-left origin
        let x = mouse_loc.x;
        let y = screen_height - mouse_loc.y;

        let _: () = msg_send![pool, drain];
        (x, y)
    }
}

#[cfg(target_os = "macos")]
fn get_screen_bounds_at_cursor(cursor_x: f64, cursor_y: f64) -> (f64, f64, f64, f64) {
    unsafe {
        let pool = NSAutoreleasePool::new(nil);

        let screens: id = msg_send![objc::class!(NSScreen), screens];
        let main_screen: id = msg_send![screens, objectAtIndex: 0usize];
        let main_frame: cocoa::foundation::NSRect = msg_send![main_screen, frame];
        let main_screen_height = main_frame.size.height;

        // Convert cursor to Cocoa coordinates (bottom-left origin) for comparison
        let cursor_cocoa_y = main_screen_height - cursor_y;

        let count: usize = msg_send![screens, count];
        for i in 0..count {
            let screen: id = msg_send![screens, objectAtIndex: i];
            let frame: cocoa::foundation::NSRect = msg_send![screen, frame];
            let visible_frame: cocoa::foundation::NSRect = msg_send![screen, visibleFrame];

            // Check if cursor is in this screen's full frame (Cocoa coordinates)
            if cursor_x >= frame.origin.x
                && cursor_x < frame.origin.x + frame.size.width
                && cursor_cocoa_y >= frame.origin.y
                && cursor_cocoa_y < frame.origin.y + frame.size.height
            {
                // Use visible frame for bounds (excludes menu bar and dock)
                // Convert to top-left origin coordinates using main screen height as reference
                let screen_left = visible_frame.origin.x;
                let screen_top = main_screen_height - (visible_frame.origin.y + visible_frame.size.height);
                let screen_right = visible_frame.origin.x + visible_frame.size.width;
                let screen_bottom = main_screen_height - visible_frame.origin.y;

                let _: () = msg_send![pool, drain];
                return (screen_left, screen_top, screen_right, screen_bottom);
            }
        }

        // Fallback: use main screen visible frame
        let frame: cocoa::foundation::NSRect = msg_send![main_screen, visibleFrame];
        let screen_left = frame.origin.x;
        let screen_top = main_screen_height - (frame.origin.y + frame.size.height);
        let screen_right = frame.origin.x + frame.size.width;
        let screen_bottom = main_screen_height - frame.origin.y;

        let _: () = msg_send![pool, drain];
        (screen_left, screen_top, screen_right, screen_bottom)
    }
}

#[cfg(target_os = "macos")]
fn set_window_position_native(window: &WebviewWindow, x: f64, y: f64) {
    if let Ok(ns_window) = window.ns_window() {
        unsafe {
            let pool = NSAutoreleasePool::new(nil);

            // Get main screen height for coordinate conversion
            let screens: id = msg_send![objc::class!(NSScreen), screens];
            let main_screen: id = msg_send![screens, objectAtIndex: 0usize];
            let main_frame: cocoa::foundation::NSRect = msg_send![main_screen, frame];
            let screen_height = main_frame.size.height;

            // Get window height
            let win_frame: cocoa::foundation::NSRect = msg_send![ns_window as id, frame];
            let win_height = win_frame.size.height;

            // Convert from top-left origin to bottom-left origin (Cocoa coordinates)
            // In Cocoa, origin is at bottom-left of the window
            let cocoa_x = x;
            let cocoa_y = screen_height - y - win_height;

            let new_origin = cocoa::foundation::NSPoint::new(cocoa_x, cocoa_y);
            let _: () = msg_send![ns_window as id, setFrameOrigin: new_origin];

            let _: () = msg_send![pool, drain];
        }
    }
}

fn show_popup_at_cursor(window: &WebviewWindow) {
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        // Get cursor position using native API (top-left origin coordinates)
        #[cfg(target_os = "macos")]
        let (cursor_x, cursor_y) = get_cursor_position_native();

        #[cfg(not(target_os = "macos"))]
        let (cursor_x, cursor_y) = {
            window.cursor_position()
                .map(|p| (p.x, p.y))
                .unwrap_or((0.0, 0.0))
        };

        // Get screen bounds for the monitor containing the cursor
        #[cfg(target_os = "macos")]
        let (_screen_left, _screen_top, screen_right, screen_bottom) =
            get_screen_bounds_at_cursor(cursor_x, cursor_y);

        #[cfg(not(target_os = "macos"))]
        let (screen_right, screen_bottom) = (1920.0, 1080.0);

        // Window size in Logical coordinates
        let win_width = POPUP_WIDTH;
        let win_height = 400.0;

        // Default: show at cursor position (right-bottom of cursor)
        let mut x = cursor_x;
        let mut y = cursor_y;

        // If overflows right edge, show to the left of cursor
        if cursor_x + win_width > screen_right {
            x = cursor_x - win_width;
        }

        // If overflows bottom edge, show above cursor
        if cursor_y + win_height > screen_bottom {
            y = cursor_y - win_height;
        }

        // Set alpha to 0, set position using native API, then show and restore alpha
        set_window_alpha(window, 0.0);

        #[cfg(target_os = "macos")]
        set_window_position_native(window, x, y);

        #[cfg(not(target_os = "macos"))]
        let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }));

        let _ = window.show();
        set_window_alpha(window, 1.0);
        let _ = window.set_focus();
    }
}

fn is_japanese() -> bool {
    // First try LANG environment variable
    if let Ok(lang) = std::env::var("LANG") {
        if lang.to_lowercase().contains("ja") {
            return true;
        }
    }

    // On macOS, check system locale using defaults command
    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = Command::new("defaults")
            .args(["read", "-g", "AppleLocale"])
            .output()
        {
            let locale = String::from_utf8_lossy(&output.stdout);
            if locale.to_lowercase().contains("ja") {
                return true;
            }
        }
    }

    false
}

fn build_tray_menu(app: &AppHandle, state: &AppState) -> tauri::Result<Menu<tauri::Wry>> {
    let is_ja = is_japanese();
    let history = state.history.lock().unwrap();
    let current_shortcut = state.current_shortcut.lock().unwrap().clone();
    let open_at_login = *state.open_at_login.lock().unwrap();

    let mut builder = MenuBuilder::new(app);

    // Add history items
    for (i, item) in history.iter().take(MAX_HISTORY_ITEMS).enumerate() {
        let label = match item {
            HistoryItem::Text(content) => {
                let display: String = content.chars().take(30).collect();
                if content.len() > 30 {
                    format!("{}...", display)
                } else {
                    display
                }
            }
            HistoryItem::Image(_) => "[Image]".to_string(),
        };
        let accelerator = if i < 9 {
            format!("{}", i + 1)
        } else {
            "0".to_string()
        };
        let menu_item = MenuItem::with_id(
            app,
            format!("history_{}", i),
            &label,
            true,
            Some(&accelerator),
        )?;
        builder = builder.item(&menu_item);
    }

    // Separator
    if !history.is_empty() {
        builder = builder.separator();
    }

    // Shortcut settings submenu
    let shortcut_label = if is_ja { "ショートカット設定" } else { "Shortcut Settings" };

    let opt_v = MenuItem::with_id(
        app,
        "shortcut_alt_v",
        if current_shortcut == "Alt+V" { "✓ ⌥ Option + V" } else { "  ⌥ Option + V" },
        true,
        None::<&str>,
    )?;
    let cmd_shift_v = MenuItem::with_id(
        app,
        "shortcut_cmd_shift_v",
        if current_shortcut == "CommandOrControl+Shift+V" { "✓ ⌘ Shift + V" } else { "  ⌘ Shift + V" },
        true,
        None::<&str>,
    )?;
    let ctrl_alt_v = MenuItem::with_id(
        app,
        "shortcut_ctrl_alt_v",
        if current_shortcut == "Control+Alt+V" { "✓ ⌃ Ctrl + Option + V" } else { "  ⌃ Ctrl + Option + V" },
        true,
        None::<&str>,
    )?;

    let shortcut_submenu = tauri::menu::SubmenuBuilder::new(app, shortcut_label)
        .item(&opt_v)
        .item(&cmd_shift_v)
        .item(&ctrl_alt_v)
        .build()?;

    builder = builder.item(&shortcut_submenu);

    // Launch at login
    let login_label = if is_ja {
        if open_at_login { "✓ ログイン時に自動起動" } else { "ログイン時に自動起動" }
    } else {
        if open_at_login { "✓ Launch at Login" } else { "Launch at Login" }
    };
    let login_item = MenuItem::with_id(app, "toggle_login", login_label, true, None::<&str>)?;
    builder = builder.item(&login_item);

    // Separator and quit
    builder = builder.separator();
    let quit_label = if is_ja { "Macopy を終了" } else { "Quit Macopy" };
    let quit = MenuItem::with_id(app, "quit", quit_label, true, Some("CmdOrCtrl+Q"))?;
    builder = builder.item(&quit);

    builder.build()
}

fn update_tray_menu(app: &AppHandle, state: &AppState) {
    if let Ok(menu) = build_tray_menu(app, state) {
        if let Some(tray) = state.tray_icon.lock().unwrap().as_ref() {
            let _ = tray.set_menu(Some(menu));
        }
    }
}

fn unregister_all_shortcuts(app: &AppHandle) {
    let shortcuts = [
        Shortcut::new(Some(Modifiers::ALT), Code::KeyV),
        Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyV),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyV),
    ];

    for shortcut in &shortcuts {
        let _ = app.global_shortcut().unregister(*shortcut);
    }
}

fn register_shortcut(app: &AppHandle, shortcut_str: &str) {
    let shortcut = match shortcut_str {
        "Alt+V" => Shortcut::new(Some(Modifiers::ALT), Code::KeyV),
        "CommandOrControl+Shift+V" => Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyV),
        "Control+Alt+V" => Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyV),
        _ => Shortcut::new(Some(Modifiers::ALT), Code::KeyV),
    };

    let app_handle = app.clone();
    let _ = app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
        if event.state != ShortcutState::Pressed {
            return;
        }

        let frontmost = get_frontmost_app();
        if let Some(state) = _app.try_state::<AppState>() {
            *state.last_active_app.lock().unwrap() = frontmost;
            update_clipboard(&app_handle, &state);
            send_history_to_frontend(&app_handle, &state);
            update_tray_menu(&app_handle, &state);
        }

        if let Some(window) = _app.get_webview_window("main") {
            show_popup_at_cursor(&window);
        }
    });
}

fn change_shortcut(app: &AppHandle, state: &AppState, new_shortcut: &str) {
    unregister_all_shortcuts(app);
    *state.current_shortcut.lock().unwrap() = new_shortcut.to_string();
    register_shortcut(app, new_shortcut);

    // Save to store
    if let Ok(store) = app.store("store.json") {
        let _ = store.set("shortcut", serde_json::json!(new_shortcut));
        let _ = store.save();
    }

    update_tray_menu(app, state);
}

fn toggle_login_item(app: &AppHandle, state: &AppState) {
    let mut open_at_login = state.open_at_login.lock().unwrap();
    *open_at_login = !*open_at_login;
    let new_value = *open_at_login;
    drop(open_at_login);

    // Save to store
    if let Ok(store) = app.store("store.json") {
        let _ = store.set("openAtLogin", serde_json::json!(new_value));
        let _ = store.save();
    }

    // Set login item using AppleScript (works without sandbox)
    let script = if new_value {
        r#"
tell application "System Events"
    make login item at end with properties {path:"/Applications/Macopy.app", hidden:false}
end tell
"#
    } else {
        r#"
tell application "System Events"
    delete login item "Macopy"
end tell
"#
    };

    let _ = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .spawn();

    update_tray_menu(app, state);
}

fn handle_history_click(app: &AppHandle, state: &AppState, index: usize) {
    let history = state.history.lock().unwrap();
    if let Some(item) = history.get(index) {
        let item = item.clone();
        drop(history);

        let last_app = state.last_active_app.lock().unwrap().clone();

        match &item {
            HistoryItem::Text(content) => {
                let clipboard = app.clipboard();
                let _ = clipboard.write_text(content);
            }
            HistoryItem::Image(data_url) => {
                // Write image to clipboard using native API
                write_image_to_clipboard(data_url);
            }
        }

        execute_paste(&last_app);
    }
}

#[cfg(target_os = "macos")]
fn write_image_to_clipboard(data_url: &str) {
    // Extract base64 data from data URL
    if let Some(base64_data) = data_url.strip_prefix("data:image/png;base64,") {
        if let Ok(bytes) = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, base64_data) {
            unsafe {
                let pool = NSAutoreleasePool::new(nil);
                let pasteboard: id = msg_send![objc::class!(NSPasteboard), generalPasteboard];
                let _: () = msg_send![pasteboard, clearContents];

                let data: id = NSData::dataWithBytes_length_(
                    nil,
                    bytes.as_ptr() as *const std::ffi::c_void,
                    bytes.len() as u64,
                );

                let png_type: id = msg_send![objc::class!(NSString), stringWithUTF8String:b"public.png\0".as_ptr()];
                let _: bool = msg_send![pasteboard, setData:data forType:png_type];

                let _: () = msg_send![pool, drain];
            }
        }
    }
}

#[cfg(not(target_os = "macos"))]
fn write_image_to_clipboard(_data_url: &str) {
    // Not implemented for other platforms
}

fn load_state_from_store(app: &AppHandle, state: &AppState) {
    if let Ok(store) = app.store("store.json") {
        // Load history
        if let Some(history_value) = store.get("history") {
            if let Ok(items) = serde_json::from_value::<Vec<serde_json::Value>>(history_value.clone()) {
                let mut history = state.history.lock().unwrap();
                history.clear();
                for item in items {
                    if let (Some(type_str), Some(content)) = (
                        item.get("type").and_then(|v| v.as_str()),
                        item.get("content").and_then(|v| v.as_str()),
                    ) {
                        match type_str {
                            "text" => history.push(HistoryItem::Text(content.to_string())),
                            "image" => history.push(HistoryItem::Image(content.to_string())),
                            _ => {}
                        }
                    }
                }
            }
        }

        // Load settings
        if let Some(show_tray) = store.get("showTrayIcon") {
            if let Some(show) = show_tray.as_bool() {
                *state.show_tray_icon.lock().unwrap() = show;
            }
        }

        if let Some(shortcut) = store.get("shortcut") {
            if let Some(s) = shortcut.as_str() {
                *state.current_shortcut.lock().unwrap() = s.to_string();
            }
        }

        if let Some(login) = store.get("openAtLogin") {
            if let Some(l) = login.as_bool() {
                *state.open_at_login.lock().unwrap() = l;
            }
        }
    }
}

fn start_clipboard_watcher(app: AppHandle, running: Arc<AtomicBool>) {
    thread::spawn(move || {
        let mut last_count = get_clipboard_change_count();

        while running.load(Ordering::SeqCst) {
            thread::sleep(Duration::from_millis(CLIPBOARD_POLL_INTERVAL_MS));

            let current_count = get_clipboard_change_count();
            if current_count != last_count {
                last_count = current_count;

                if let Some(state) = app.try_state::<AppState>() {
                    if update_clipboard(&app, &state) {
                        update_tray_menu(&app, &state);
                    }
                }
            }
        }
    });
}

#[tauri::command]
fn hide_window(window: WebviewWindow) {
    let _ = window.hide();
}

#[tauri::command]
fn paste_from_clipboard(state: State<AppState>) {
    let app_name = state.last_active_app.lock().unwrap().clone();
    execute_paste(&app_name);
}

#[tauri::command]
fn update_window_height(window: WebviewWindow, height: f64) {
    if height > 0.0 {
        // Use Logical size since height comes from CSS pixels
        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: POPUP_WIDTH,
            height,
        }));
    }
}

#[tauri::command]
fn copy_text(app: AppHandle, text: String) {
    let clipboard = app.clipboard();
    let _ = clipboard.write_text(text);
}

#[tauri::command]
fn copy_image(_app: AppHandle, data_url: String) {
    write_image_to_clipboard(&data_url);
}

#[tauri::command]
fn toggle_tray_icon(app: AppHandle, state: State<AppState>) -> bool {
    let mut show = state.show_tray_icon.lock().unwrap();
    *show = !*show;
    let new_value = *show;
    drop(show);

    // Save to store
    if let Ok(store) = app.store("store.json") {
        let _ = store.set("showTrayIcon", serde_json::json!(new_value));
        let _ = store.save();
    }

    // Actually show/hide the tray icon
    if let Some(tray) = state.tray_icon.lock().unwrap().as_ref() {
        let _ = tray.set_visible(new_value);
    }

    new_value
}

#[tauri::command]
fn get_tray_icon_state(state: State<AppState>) -> bool {
    *state.show_tray_icon.lock().unwrap()
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState::default();
    let watcher_running = Arc::new(AtomicBool::new(true));
    let watcher_running_clone = watcher_running.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Focus existing window when second instance is launched
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            hide_window,
            paste_from_clipboard,
            update_window_height,
            copy_text,
            copy_image,
            toggle_tray_icon,
            get_tray_icon_state,
            quit_app,
        ])
        .setup(move |app| {
            // Load state from store
            if let Some(state) = app.try_state::<AppState>() {
                load_state_from_store(app.handle(), &state);
            }

            // Hide dock icon on macOS
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            // Build tray menu
            let menu = if let Some(state) = app.try_state::<AppState>() {
                build_tray_menu(app.handle(), &state)?
            } else {
                let quit = MenuItem::with_id(app, "quit", "Quit Macopy", true, None::<&str>)?;
                Menu::with_items(app, &[&quit])?
            };

            // Load tray icon from embedded PNG
            let png_data = include_bytes!("../icons/trayTemplate.png");
            let img = image::load_from_memory(png_data).expect("Failed to decode tray icon");
            let rgba = img.to_rgba8();
            let (width, height) = rgba.dimensions();
            let tray_icon_image = Image::new_owned(rgba.into_raw(), width, height);

            let tray = TrayIconBuilder::new()
                .menu(&menu)
                .icon(tray_icon_image)
                .icon_as_template(true)
                .on_menu_event(move |app, event| {
                    let event_id = event.id.as_ref();

                    if event_id == "quit" {
                        app.exit(0);
                    } else if event_id.starts_with("history_") {
                        if let Ok(index) = event_id.replace("history_", "").parse::<usize>() {
                            if let Some(state) = app.try_state::<AppState>() {
                                handle_history_click(app, &state, index);
                            }
                        }
                    } else if event_id == "shortcut_alt_v" {
                        if let Some(state) = app.try_state::<AppState>() {
                            change_shortcut(app, &state, "Alt+V");
                        }
                    } else if event_id == "shortcut_cmd_shift_v" {
                        if let Some(state) = app.try_state::<AppState>() {
                            change_shortcut(app, &state, "CommandOrControl+Shift+V");
                        }
                    } else if event_id == "shortcut_ctrl_alt_v" {
                        if let Some(state) = app.try_state::<AppState>() {
                            change_shortcut(app, &state, "Control+Alt+V");
                        }
                    } else if event_id == "toggle_login" {
                        if let Some(state) = app.try_state::<AppState>() {
                            toggle_login_item(app, &state);
                        }
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if let Some(state) = app.try_state::<AppState>() {
                                let frontmost = get_frontmost_app();
                                *state.last_active_app.lock().unwrap() = frontmost;
                                update_clipboard(app, &state);
                                send_history_to_frontend(app, &state);
                                update_tray_menu(app, &state);
                            }
                            show_popup_at_cursor(&window);
                        }
                    }
                })
                .build(app)?;

            // Store tray icon reference
            if let Some(state) = app.try_state::<AppState>() {
                *state.tray_icon.lock().unwrap() = Some(tray);

                // Set initial visibility
                let show_tray = *state.show_tray_icon.lock().unwrap();
                if let Some(tray) = state.tray_icon.lock().unwrap().as_ref() {
                    let _ = tray.set_visible(show_tray);
                }
            }

            // Register global shortcut
            let shortcut = {
                if let Some(state) = app.try_state::<AppState>() {
                    state.current_shortcut.lock().unwrap().clone()
                } else {
                    "Alt+V".to_string()
                }
            };
            register_shortcut(app.handle(), &shortcut);

            // Setup window blur handler
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        let _ = window_clone.hide();
                    }
                });
            }

            // Start clipboard watcher
            start_clipboard_watcher(app.handle().clone(), watcher_running_clone);

            // Ensure window is hidden on startup
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }

            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Prevent window from closing, just hide it
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
