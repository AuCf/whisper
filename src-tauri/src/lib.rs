mod commands;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            write_binary_file,
            read_binary_file,
            create_file,
            create_dir,
            delete_file,
            delete_dir,
            rename_path,
            read_dir,
            search_workspace,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
