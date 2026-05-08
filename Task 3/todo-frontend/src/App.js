import React, { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [notes, setNotes] = useState([]);

  const API_URL = "http://127.0.0.1:8000";

  // FETCH NOTES
  const fetchNotes = async () => {
    const response = await axios.get(`${API_URL}/get-notes`);
    setNotes(response.data);
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  // CREATE NOTE
  const createNote = async () => {
    if (!title || !content) {
      alert("Please fill all fields");
      return;
    }

    await axios.put(`${API_URL}/create-notes`, {
      title,
      content,
    });

    setTitle("");
    setContent("");

    fetchNotes();
  };

  // UPDATE NOTE
  const updateNote = async (id) => {
    const newTitle = prompt("Enter updated title");
    const newContent = prompt("Enter updated content");

    if (!newTitle || !newContent) return;

    await axios.post(`${API_URL}/update-notes/${id}`, {
      title: newTitle,
      content: newContent,
    });

    fetchNotes();
  };

  // DELETE NOTE
  const deleteNote = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete?"
    );

    if (!confirmDelete) return;

    await axios.delete(`${API_URL}/delete-notes/${id}`);

    fetchNotes();
  };

  return (
    <div style={{ padding: "30px" }}>
      <h1>To-Do App</h1>

      <input
        type="text"
        placeholder="Enter title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <br />
      <br />

      <input
        type="text"
        placeholder="Enter content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <br />
      <br />

      <button onClick={createNote}>Create Note</button>

      <hr />

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Content</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {notes.map((note) => (
            <tr key={note.id}>
              <td>{note.id}</td>
              <td>{note.title}</td>
              <td>{note.content}</td>

              <td>
                <button onClick={() => updateNote(note.id)}>
                  Edit
                </button>

                <button
                  onClick={() => deleteNote(note.id)}
                  style={{ marginLeft: "10px" }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;