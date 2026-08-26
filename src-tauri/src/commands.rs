use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::fs::OpenOptions;
use std::path::Path;
use std::time::UNIX_EPOCH;
use tauri::{command, Manager};

#[derive(Serialize, Deserialize, Debug)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileEntry>>,
}

#[derive(Serialize)]
pub struct FileSnapshot {
    pub content: String,
    pub version: String,
}

#[derive(Serialize)]
pub struct WriteFileOutcome {
    pub status: &'static str,
    pub version: Option<String>,
}

fn file_version(path: &Path) -> Result<String, String> {
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let modified = metadata.modified().map_err(|e| e.to_string())?;
    let elapsed = modified
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?;
    Ok(format!(
        "{}:{}:{}",
        elapsed.as_secs(),
        elapsed.subsec_nanos(),
        metadata.len()
    ))
}

fn is_supported_document(path: &Path) -> bool {
    path.is_file()
        && path
            .extension()
            .and_then(|extension| extension.to_str())
            .map(|extension| {
                matches!(
                    extension.to_ascii_lowercase().as_str(),
                    "md" | "markdown" | "mdx"
                )
            })
            .unwrap_or(false)
}

/// Return supported documents passed by the operating system when launching Whisper.
#[command]
pub fn get_startup_files() -> Vec<String> {
    env::args_os()
        .skip(1)
        .map(std::path::PathBuf::from)
        .filter(|path| is_supported_document(path))
        .map(|path| path.to_string_lossy().into_owned())
        .collect()
}

/// Read file contents together with the disk version used for conflict detection.
#[command]
pub fn read_file_snapshot(path: String) -> Result<FileSnapshot, String> {
    let path = Path::new(&path);
    for _ in 0..3 {
        let version_before = file_version(path)?;
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        let version_after = file_version(path)?;
        if version_before == version_after {
            return Ok(FileSnapshot {
                content,
                version: version_after,
            });
        }
    }
    Err("读取文件时检测到持续的外部修改，请稍后重试".into())
}

/// Return the current disk version without reading the document into the WebView.
#[command]
pub fn get_file_version(path: String) -> Result<String, String> {
    file_version(Path::new(&path))
}

/// Write content to a file (creates if not exists)
#[command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

/// Save only when the file still matches the version last read by the editor.
#[command]
pub fn write_file_checked(
    path: String,
    content: String,
    expected_version: Option<String>,
    force: bool,
) -> Result<WriteFileOutcome, String> {
    let file_path = Path::new(&path);
    if !force {
        if let Some(expected) = expected_version {
            let current = file_version(file_path)?;
            if current != expected {
                return Ok(WriteFileOutcome {
                    status: "conflict",
                    version: Some(current),
                });
            }
        }
    }

    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(file_path, content).map_err(|e| e.to_string())?;
    Ok(WriteFileOutcome {
        status: "saved",
        version: Some(file_version(file_path)?),
    })
}

/// Write binary data to a file (used for clipboard images)
#[command]
pub fn write_binary_file(path: String, data: Vec<u8>) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, data).map_err(|e| e.to_string())
}

/// Read binary data from a file (used for local images in the preview)
#[command]
pub fn read_binary_file(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| e.to_string())
}

/// Get the global app image storage directory (~/AppData/Roaming/whisper/images)
#[command]
pub fn get_app_image_dir(app: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let img_dir = app_dir.join("images");
    fs::create_dir_all(&img_dir).map_err(|e| e.to_string())?;
    Ok(img_dir.to_string_lossy().to_string())
}

/// Create a new empty file
#[command]
pub fn create_file(path: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Create a directory (and any missing parents)
#[command]
pub fn create_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

/// Delete a file
#[command]
pub fn delete_file(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| e.to_string())
}

/// Delete a directory recursively
#[command]
pub fn delete_dir(path: String) -> Result<(), String> {
    fs::remove_dir_all(&path).map_err(|e| e.to_string())
}

/// Rename / move a file or directory
#[command]
pub fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}

/// Read a directory recursively and return the tree structure
#[command]
pub fn read_dir(path: String) -> Result<Vec<FileEntry>, String> {
    read_dir_recursive(&path).map_err(|e| e.to_string())
}

fn read_dir_recursive(path: &str) -> std::io::Result<Vec<FileEntry>> {
    let mut entries: Vec<FileEntry> = vec![];
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let meta = entry.metadata()?;
        let entry_path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let path_str = entry_path.to_string_lossy().to_string();

        if meta.is_dir() {
            // Skip hidden directories
            if name.starts_with('.') {
                continue;
            }
            let children = read_dir_recursive(&path_str).unwrap_or_default();
            entries.push(FileEntry {
                name,
                path: path_str,
                is_dir: true,
                children: Some(children),
            });
        } else {
            // Only include markdown files (and a few others for context)
            let ext = entry_path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();
            if matches!(ext.as_str(), "md" | "markdown" | "txt" | "mdx") || ext.is_empty() {
                entries.push(FileEntry {
                    name,
                    path: path_str,
                    is_dir: false,
                    children: None,
                });
            }
        }
    }
    // Sort: directories first, then files, both alphabetically
    entries.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        } else if a.is_dir {
            std::cmp::Ordering::Less
        } else {
            std::cmp::Ordering::Greater
        }
    });
    Ok(entries)
}

#[derive(Serialize)]
pub struct SearchMatch {
    pub line_number: usize,
    pub line_text: String,
}

#[derive(Serialize)]
pub struct SearchResult {
    pub file_name: String,
    pub file_path: String,
    pub matches: Vec<SearchMatch>,
}

fn search_dir_recursive(
    path: &str,
    query: &str,
    results: &mut Vec<SearchResult>,
) -> std::io::Result<()> {
    if query.is_empty() {
        return Ok(());
    }
    let query_lower = query.to_lowercase();
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let meta = entry.metadata()?;
        let entry_path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let path_str = entry_path.to_string_lossy().to_string();

        if meta.is_dir() {
            if !name.starts_with('.')
                && name != "node_modules"
                && name != "target"
                && name != "dist"
            {
                let _ = search_dir_recursive(&path_str, query, results);
            }
        } else {
            let ext = entry_path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();
            if matches!(ext.as_str(), "md" | "markdown" | "txt" | "mdx") {
                if let Ok(content) = fs::read_to_string(&entry_path) {
                    let mut matches = vec![];
                    for (idx, line) in content.lines().enumerate() {
                        if line.to_lowercase().contains(&query_lower) {
                            matches.push(SearchMatch {
                                line_number: idx + 1,
                                line_text: line.trim().to_string(),
                            });
                            if matches.len() >= 50 {
                                break;
                            }
                        }
                    }
                    if !matches.is_empty() {
                        results.push(SearchResult {
                            file_name: name,
                            file_path: path_str,
                            matches,
                        });
                    }
                }
            }
        }
    }
    Ok(())
}

#[command]
pub fn search_workspace(path: String, query: String) -> Result<Vec<SearchResult>, String> {
    let mut results = vec![];
    let query = query.trim();
    if query.is_empty() {
        return Ok(results);
    }
    search_dir_recursive(&path, query, &mut results).map_err(|e| e.to_string())?;
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temporary_document_path() -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after Unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!(
            "whisper-conflict-{}-{unique}.md",
            std::process::id()
        ))
    }

    #[test]
    fn checked_write_preserves_external_changes_until_forced() {
        let path = temporary_document_path();
        fs::write(&path, "initial").expect("create temporary document");
        let path_string = path.to_string_lossy().into_owned();
        let snapshot = read_file_snapshot(path_string.clone()).expect("read initial snapshot");

        fs::write(&path, "external change").expect("simulate external editor");
        let conflict = write_file_checked(
            path_string.clone(),
            "local change".into(),
            Some(snapshot.version),
            false,
        )
        .expect("check conflicting write");

        assert_eq!(conflict.status, "conflict");
        assert_eq!(fs::read_to_string(&path).unwrap(), "external change");

        let saved = write_file_checked(path_string, "local change".into(), None, true)
            .expect("force confirmed write");
        assert_eq!(saved.status, "saved");
        assert_eq!(fs::read_to_string(&path).unwrap(), "local change");

        let _ = fs::remove_file(path);
    }
}
