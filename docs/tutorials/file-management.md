# File Management Tutorial

A comprehensive tutorial for mastering file management in Web Desktop.

## 🎯 Learning Objectives

By the end of this tutorial, you will be able to:
- Navigate and manage local and remote file systems
- Perform advanced file operations efficiently
- Set up and use multiple storage adapters
- Organize and search files effectively
- Use file deduplication and metadata features

---

## 📂 Basic File Navigation

### Step 1: Opening File Manager

1. **Using App Launcher**:
   - Press `Alt+Space`
   - Type "files" or "file manager"
   - Press `Enter`

2. **Using Desktop Icon**:
   - Double-click the Files icon on desktop

### Step 2: Basic Navigation

#### Understanding the Interface
```
┌─────────────────────────────────────────────────┐
│ 📁 Home > 📁 Documents > 📁 Projects           │ ← Breadcrumb navigation
├─────────────────────────────────────────────────┤
│ 🔄 📁 New  ⬆️ ⬇️ 📤 📥 ⚙️                    │ ← Toolbar
├─────────────────────────────────────────────────┤
│ 📁 📁 📁 📄 📄 📄                               │ ← File browser
│ 📁 📄 📁 📄 📁 📄                               │
│ 📄 📁 📁 📄 📁 📄                               │
└─────────────────────────────────────────────────┘
```

#### Navigation Methods
1. **Breadcrumb Navigation**: Click folder names in the path
2. **Double-Click**: Open folders with double-click
3. **Keyboard Navigation**: Use arrow keys to navigate
4. **Address Bar**: Type full path and press Enter

#### Keyboard Shortcuts
- `↑/↓` - Navigate up/down through items
- `Enter` - Open selected item
- `Backspace` - Go to parent directory
- `Alt+↑` - Go back in history
- `Alt+↓` - Go forward in history
- `Ctrl+L` - Focus address bar
- `F5` - Refresh current directory

---

## 📤 File Operations

### Step 3: Uploading Files

#### Method 1: Drag and Drop
1. **Open File Manager** to desired destination folder
2. **Open your computer's file explorer**
3. **Drag files** from your computer to the File Manager window
4. **Release** to start upload

#### Method 2: Upload Button
1. **Navigate** to desired folder
2. **Click the upload button** (📤) in toolbar
3. **Select files** from the dialog
4. **Click "Open"** to start upload

#### Upload Features
- **Multiple files**: Select multiple files at once
- **Progress tracking**: See upload progress for each file
- **Resume support**: Resume interrupted uploads (if supported)
- **File size limit**: 100MB per file (configurable)

### Step 4: Creating and Organizing

#### Creating Folders
1. **Right-click** in empty space
2. **Select "New Folder"**
3. **Enter folder name**
4. **Press Enter** to confirm

#### Alternative Method
1. **Click "New" button** in toolbar
2. **Select "Folder"**
3. **Type folder name**

#### Batch Operations
1. **Select multiple files**:
   - `Ctrl+Click` for individual selection
   - `Shift+Click` for range selection
   - `Ctrl+A` to select all

2. **Perform operations**:
   - Right-click selected files
   - Choose operation (Copy, Cut, Delete, etc.)

---

## ✂️ Advanced File Operations

### Step 5: Copy, Move, and Rename

#### Copy Files
1. **Select file(s)** to copy
2. **Right-click** → "Copy" or press `Ctrl+C`
3. **Navigate** to destination
4. **Right-click** → "Paste" or press `Ctrl+V`

#### Move Files
1. **Select file(s)** to move
2. **Right-click** → "Cut" or press `Ctrl+X`
3. **Navigate** to destination
4. **Right-click** → "Paste" or press `Ctrl+V`

#### Rename Files
1. **Select file** to rename
2. **Right-click** → "Rename" or press `F2`
3. **Enter new name**
4. **Press Enter** to confirm

#### Drag and Drop Moving
1. **Select file(s)**
2. **Drag** to destination folder
3. **Release** to move

#### Copy with Drag and Drop
1. **Select file(s)**
2. **Drag** with `Ctrl` held down
3. **Release** to copy

### Step 6: File Properties and Preview

#### View File Properties
1. **Right-click** on file
2. **Select "Properties"**
3. **View information**:
   - File name and type
   - File size
   - Creation and modification dates
   - Permissions

#### File Preview
1. **Click on a file** to preview
2. **Supported preview types**:
   - **Text files**: Code, documents, logs
   - **Images**: JPG, PNG, GIF, WebP
   - **Documents**: PDF files

#### Preview Panel Features
- **Syntax highlighting** for code files
- **Image thumbnails** and zoom
- **Scrollable** for large files
- **Copy** preview content

---

## 🗂️ Storage Management

### Step 7: Adding External Storage

#### Adding FTP Storage
1. **Click "+" button** in toolbar
2. **Select "FTP"**
3. **Configure connection**:
   ```
   Server: ftp.example.com
   Port: 21
   Username: your_username
   Password: your_password
   Path: /remote/folder
   ```
4. **Click "Connect"** to test and save

#### Adding SFTP Storage
1. **Click "+" button** → "SFTP"
2. **Configure connection**:
   ```
   Host: sftp.example.com
   Port: 22
   Username: your_username
   Authentication: Password or SSH Key
   Private Key: (if using key authentication)
   ```
3. **Test connection** and save

#### Adding WebDAV Storage
1. **Click "+" button** → "WebDAV"
2. **Configure connection**:
   ```
   URL: https://dav.example.com/remote.php/dav/files/username/
   Username: your_username
   Password: your_password
   ```
3. **Connect** and save

### Step 8: Managing Storage Connections

#### View Connected Storage
- **Sidebar**: Shows all connected storages
- **Connection status**: Connected/disconnected indicators
- **Storage type icons**: Visual indicators for each type

#### Storage Operations
1. **Disconnect**: Right-click storage → "Disconnect"
2. **Reconnect**: Right-click storage → "Reconnect"
3. **Edit settings**: Right-click → "Edit"
4. **Remove**: Right-click → "Remove"

---

## 🔍 Search and Organization

### Step 9: File Search

#### Quick Search
1. **Click search bar** at top of File Manager
2. **Type search query**
3. **Results appear** as you type
4. **Press Enter** to see all results

#### Search Operators
- **Exact match**: `"filename.txt"`
- **Wildcards**: `*.jpg`, `doc*.pdf`
- **Exclude terms**: `search -exclude`
- **File types**: `type:image`, `type:document`

#### Advanced Search
1. **Click advanced search** (magnifying glass with +)
2. **Set filters**:
   - **File type**: Documents, images, videos, etc.
   - **Size range**: Min/max file size
   - **Date range**: Creation/modification dates
   - **Location**: Specific folders or storages

### Step 10: Smart Organization

#### File Categorization
Web Desktop automatically categorizes files:
- **Documents**: PDF, DOC, TXT files
- **Images**: JPG, PNG, GIF, WebP
- **Videos**: MP4, MKV, AVI files
- **Audio**: MP3, FLAC, WAV files
- **Archives**: ZIP, RAR, 7Z files

#### Creating Smart Folders
1. **Right-click** → "New Smart Folder"
2. **Set criteria**:
   - File type, size, date
   - Name patterns
   - Content-based rules
3. **Name the smart folder**
4. **Access automatically updated content**

---

## 🔄 File Deduplication

### Step 11: Finding Duplicate Files

#### Run Duplicate Scan
1. **Open "Smart Storage"** from app launcher
2. **Go to "Deduplication" tab**
3. **Click "Scan for Duplicates"**
4. **Wait for scan to complete**

#### Understanding Results
- **Exact duplicates**: Files with identical content
- **Similar images**: AI-detected visual similarity
- **Potential duplicates**: Similar file names or sizes

#### Reviewing Duplicates
1. **Browse duplicate groups**
2. **Compare files side-by-side**
3. **View file details and locations**
4. **Mark files for deletion**

### Step 12: Managing Duplicates

#### Selective Deletion
1. **Review each duplicate group**
2. **Select files to keep** (check best quality/location)
3. **Mark others for deletion**
4. **Preview before deleting**

#### Batch Operations
1. **Select multiple groups**
2. **Choose action**:
   - "Keep newest"
   - "Keep oldest"
   - "Keep in specific folder"
   - "Manual selection"
3. **Execute cleanup**

#### Safety Features
- **Preview before delete**: See exactly what will be deleted
- **Undo capability**: Restore deleted files if needed
- **Backup option**: Move to trash instead of permanent delete

---

## 🛠️ Power User Features

### Step 13: Batch File Operations

#### Batch Rename
1. **Select multiple files**
2. **Right-click** → "Batch Rename"
3. **Choose pattern**:
   - Add prefix/suffix
   - Replace text
   - Number files
   - Change case
4. **Preview changes** before applying

#### Batch Processing
1. **Select files for batch operation**
2. **Right-click** → "Batch Operations"
3. **Available operations**:
   - Convert file formats
   - Compress images
   - Extract metadata
   - Apply watermarks

### Step 14: File Metadata

#### View Metadata
1. **Right-click file** → "Properties"
2. **"Metadata" tab**
3. **View detailed information**:
   - **EXIF data** for images (camera settings, GPS)
   - **Audio tags** for music files (artist, album, genre)
   - **Video specs** for movies (resolution, codec, duration)
   - **Document properties** (author, creation date)

#### Edit Metadata
1. **Select "Edit Metadata"**
2. **Modify available fields**
3. **Save changes**

#### Metadata Search
1. **Use advanced search**
2. **Search by metadata fields**:
   - Camera model, ISO, aperture for photos
   - Artist, album for music
   - Author for documents

---

## 🔧 File Server Management

### Step 15: Setting Up File Servers

#### FTP Server Setup
1. **Open "File Servers"** from app launcher
2. **Select "FTP Server"**
3. **Configure settings**:
   ```
   Port: 21
   Max users: 10
   Root directory: /home/username/files
   Allow anonymous: No
   ```
4. **Add user accounts**
5. **Set directory permissions**
6. **Start server**

#### WebDAV Server Setup
1. **Select "WebDAV Server"**
2. **Configure**:
   ```
   Port: 8080
   Authentication: Required
   Directory: /shared/files
   ```
3. **Start server**
4. **Access with**: `http://your-server:8080/webdav`

### Step 16: File Server Access

#### Accessing Your Servers
- **FTP**: `ftp://your-server:21`
- **SFTP**: `sftp://user@your-server:22`
- **WebDAV**: Mount as network drive or use WebDAV client

#### Security Best Practices
- **Use strong passwords**
- **Limit user access to specific directories**
- **Enable encryption** (FTPS, SFTP)
- **Monitor connection logs**
- **Regularly update server software**

---

## 🎓 Summary and Best Practices

### Key Takeaways

1. **Efficient Navigation**: Master keyboard shortcuts and breadcrumb navigation
2. **Organized Storage**: Use external storage adapters for different file types
3. **Smart Search**: Utilize advanced search features to find files quickly
4. **Duplicate Management**: Regularly scan for and manage duplicate files
5. **Metadata Utilization**: Leverage file metadata for organization and search

### Best Practices

#### File Organization
- **Create logical folder structure**
- **Use consistent naming conventions**
- **Separate files by type and purpose**
- **Regular cleanup and organization**

#### Security
- **Regular backups of important files**
- **Use encrypted connections for remote storage**
- **Monitor file server access logs**
- **Keep software updated**

#### Performance
- **Use appropriate storage types for different needs**
- **Regular disk cleanup and maintenance**
- **Monitor storage usage and capacity**
- **Use file compression when appropriate**

### Next Steps

Congratulations! You've mastered file management in Web Desktop. Continue learning with:
- [Terminal Usage Tutorial](terminal-usage.md)
- [Advanced Features Tutorial](advanced-features.md)
- [System Management Guide](../user-guide/manual.md#system-management)

---

**Need Help?**
- [Troubleshooting Guide](../troubleshooting/common-issues.md)
- [User Manual](../user-guide/manual.md)
- [FAQ](../user-guide/faq.md)