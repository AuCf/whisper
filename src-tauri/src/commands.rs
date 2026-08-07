use serde::{Deserialize, Serialize};
use std::fs;
use std::fs::OpenOptions;
use std::path::Path;
use tauri::command;

#[derive(Serialize, Deserialize, Debug)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileEntry>>,
}

/// Read a file's content as a UTF-8 string
#[command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
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

fn search_dir_recursive(path: &str, query: &str, results: &mut Vec<SearchResult>) -> std::io::Result<()> {
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
            if !name.starts_with('.') && name != "node_modules" && name != "target" && name != "dist" {
                let _ = search_dir_recursive(&path_str, query, results);
            }
        } else {
            let ext = entry_path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
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
