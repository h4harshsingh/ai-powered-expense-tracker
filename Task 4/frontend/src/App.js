import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";
const CHUNK_SIZE = 1 * 1024 * 1024;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function App() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState("");
  const pollingRef = useRef(null);

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${API_URL}/files-list`);
      setFiles(response.data);
      return response.data;
    } catch {
      showMessage("Failed to load files. Is the backend running?", "error");
      return [];
    }
  };

  useEffect(() => {
    fetchFiles();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const startPolling = () => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      const latestFiles = await fetchFiles();
      if (!latestFiles.some(f => f.status === "uploading")) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, 2000);
  };

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(""), 3000);
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadProgress(0);
    }
  };

  const handleChunkedUpload = async () => {
    if (!selectedFile) {
      showMessage("Please select a file first.", "error");
      return;
    }

    const totalChunks = Math.ceil(selectedFile.size / CHUNK_SIZE);
    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const formData = new FormData();
        formData.append("file", selectedFile.slice(start, Math.min(start + CHUNK_SIZE, selectedFile.size)), selectedFile.name);
        formData.append("upload_id", uploadId);
        formData.append("chunk_index", i);
        formData.append("total_chunks", totalChunks);
        formData.append("original_name", selectedFile.name);
        formData.append("mime_type", selectedFile.type || "application/octet-stream");

        await axios.post(`${API_URL}/upload-chunk`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      setSelectedFile(null);
      setUploadProgress(0);
      document.getElementById("fileInput").value = "";
      showMessage("File uploaded successfully!");
      await fetchFiles();

    } catch (error) {
      showMessage(
        error.response?.data?.detail || "Chunked upload failed. Please try again.",
        "error"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (id, originalName) => {
    const link = document.createElement("a");
    link.href = `${API_URL}/download-file/${id}`;
    link.setAttribute("download", originalName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await axios.delete(`${API_URL}/delete-file/${id}`);
      showMessage(`"${name}" deleted successfully.`);
      fetchFiles();
    } catch {
      showMessage("Delete failed. Please try again.", "error");
    }
  };

  return (
    <div className="app">
      <h1 className="app-title">📁 File Manager</h1>

      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <div className="upload-card">
        <h2>Upload a File</h2>
        <div className="upload-row">
          <input
            id="fileInput"
            type="file"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <button
            onClick={handleChunkedUpload}
            disabled={uploading || !selectedFile}
            className="btn btn-upload"
          >
            {uploading ? `Uploading... ${uploadProgress}%` : "Upload"}
          </button>
        </div>

        {selectedFile && !uploading && (
          <p className="file-info">
            Selected: <strong>{selectedFile.name}</strong> ({formatSize(selectedFile.size)})
          </p>
        )}

        {uploading && (
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
        )}
      </div>

      <div className="files-section">
        <h2>Uploaded Files ({files.length})</h2>
        {files.length === 0 ? (
          <p className="empty-message">No files uploaded yet.</p>
        ) : (
          <table className="files-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>File Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id}>
                  <td>{file.id}</td>
                  <td>{file.original_name}</td>
                  <td>{file.file_type}</td>
                  <td>{formatSize(file.file_size)}</td>
                  <td>
                    <span className={`status-badge ${file.status}`}>
                      {file.status === "uploading" ? "⏳ uploading" : file.status}
                    </span>
                  </td>
                  <td className="actions">
                    <a href={`${API_URL}${file.view_url}`} target="_blank" rel="noreferrer">
                      <button className="btn btn-view">View</button>
                    </a>
                    <button
                      className="btn btn-download"
                      onClick={() => handleDownload(file.id, file.original_name)}
                      disabled={file.status === "uploading"}
                    >
                      Download
                    </button>
                    <button
                      className="btn btn-delete"
                      onClick={() => handleDelete(file.id, file.original_name)}
                      disabled={file.status === "uploading"}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default App;