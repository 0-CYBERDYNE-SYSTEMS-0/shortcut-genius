use std::net::TcpStream;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Manager, State, WebviewUrl, WebviewWindowBuilder};

#[cfg(not(debug_assertions))]
use tauri::AppHandle;

/// Holds the spawned backend process (production only).
pub struct ServerProcess(pub Mutex<Option<std::process::Child>>);

/// Tauri command: returns the base URL of the backend API server.
#[tauri::command]
fn get_api_base_url(_state: State<'_, ServerProcess>) -> String {
    let port = get_server_port();
    format!("http://localhost:{}", port)
}

/// Read the server port from the `PORT` env variable, defaulting to 4321.
fn get_server_port() -> u16 {
    std::env::var("PORT")
        .ok()
        .and_then(|v| v.parse::<u16>().ok())
        .unwrap_or(4321)
}

/// Block until `localhost:port` accepts TCP connections or `timeout_secs` elapses.
fn wait_for_server(port: u16, timeout_secs: u64) -> bool {
    let addr = format!("127.0.0.1:{}", port);
    let deadline = std::time::Instant::now() + Duration::from_secs(timeout_secs);
    while std::time::Instant::now() < deadline {
        if TcpStream::connect(&addr).is_ok() {
            return true;
        }
        std::thread::sleep(Duration::from_millis(200));
    }
    false
}

/// Spawn the bundled Node.js server (production builds only).
/// Returns the child process so the caller can kill it on exit.
#[cfg(not(debug_assertions))]
fn spawn_server(app: &AppHandle) -> Option<std::process::Child> {
    let resource_dir = app.path().resource_dir().ok()?;
    let server_js = resource_dir.join("server").join("index.js");

    if !server_js.exists() {
        eprintln!(
            "[shortcut-genius] Bundled server not found at {}",
            server_js.display()
        );
        return None;
    }

    // Locate the `node` binary – fall back to the PATH default.
    let node_bin = which_node().unwrap_or_else(|| "node".to_string());
    let port = get_server_port();

    match std::process::Command::new(&node_bin)
        .arg(&server_js)
        .env("PORT", port.to_string())
        .env("NODE_ENV", "production")
        // Inherit stdout/stderr so logs appear in the OS console.
        .stdout(std::process::Stdio::inherit())
        .stderr(std::process::Stdio::inherit())
        .spawn()
    {
        Ok(child) => {
            println!(
                "[shortcut-genius] Backend server started (pid {}) on port {}",
                child.id(),
                port
            );
            Some(child)
        }
        Err(e) => {
            eprintln!(
                "[shortcut-genius] Failed to start backend server with '{}': {}",
                node_bin, e
            );
            None
        }
    }
}

/// Try to find the absolute path to the `node` binary via `which` / `where`.
#[cfg(not(debug_assertions))]
fn which_node() -> Option<String> {
    let cmd = if cfg!(windows) { "where" } else { "which" };
    let out = std::process::Command::new(cmd).arg("node").output().ok()?;
    if out.status.success() {
        let path = String::from_utf8_lossy(&out.stdout)
            .lines()
            .next()?
            .trim()
            .to_string();
        Some(path)
    } else {
        None
    }
}

/// Kill the server process stored in `state` (called on window close).
fn kill_server(state: &ServerProcess) {
    if let Ok(mut guard) = state.0.lock() {
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            println!("[shortcut-genius] Backend server stopped.");
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(ServerProcess(Mutex::new(None)))
        .setup(|app| {
            let port = get_server_port();

            // ── Production: spawn the bundled Express server ──────────────
            #[cfg(not(debug_assertions))]
            {
                let child = spawn_server(app.handle());
                {
                    let state = app.state::<ServerProcess>();
                    if let Ok(mut guard) = state.0.lock() {
                        *guard = child;
                    }
                }

                if !wait_for_server(port, 30) {
                    eprintln!(
                        "[shortcut-genius] Server on port {} did not become ready in time.",
                        port
                    );
                }
            }

            // ── Development: the dev server is already running ────────────
            #[cfg(debug_assertions)]
            {
                if !wait_for_server(port, 60) {
                    eprintln!(
                        "[shortcut-genius] Dev server on port {} not found. \
                         Make sure `npm run dev` is running.",
                        port
                    );
                }
            }

            let url = format!("http://localhost:{}", port);
            WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External(url.parse().expect("invalid server URL")),
            )
            .title("ShortcutGenius")
            .inner_size(1280.0, 800.0)
            .min_inner_size(900.0, 600.0)
            .resizable(true)
            .build()?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if let Some(state) = window.try_state::<ServerProcess>() {
                    kill_server(&state);
                }
            }
        })
        .invoke_handler(tauri::generate_handler![get_api_base_url])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
