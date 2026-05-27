import axios from 'axios';

export var BASE_URL = 'http://127.0.0.1:8000';

var CHUNK_SIZE = 1 * 1024 * 1024; // 1MB

export function uploadFileInChunks(file, onProgress) {
  var totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  var uploadId    = String(Date.now()) + '-' + Math.random().toString(36).slice(2);

  // Build array of chunk promises sequentially using reduce
  var chain = Promise.resolve(null);
  var fileId = null;

  for (var i = 0; i < totalChunks; i++) {
    // Capture i in closure
    (function(index) {
      chain = chain.then(function() {
        var start = index * CHUNK_SIZE;
        var end   = Math.min(start + CHUNK_SIZE, file.size);
        var chunk = file.slice(start, end);

        var form = new FormData();
        form.append('file',          chunk);
        form.append('upload_id',     uploadId);
        form.append('chunk_index',   String(index));
        form.append('total_chunks',  String(totalChunks));
        form.append('original_name', file.name);
        form.append('mime_type',     file.type || 'image/jpeg');

        return axios.post(BASE_URL + '/upload-chunk', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }).then(function(res) {
          var pct = Math.round(((index + 1) / totalChunks) * 100);
          onProgress(pct);

          if (res.data.done === true) {
            fileId = res.data.file_id;
          }
          return res.data;
        });
      });
    })(i);
  }

  return chain.then(function() {
    if (!fileId) {
      throw new Error('No file_id returned after upload completed');
    }
    return fileId;
  });
}

export function scanReceipt(fileId) {
  return axios
    .post(BASE_URL + '/scan-receipt/' + String(fileId))
    .then(function(r) { return r.data; });
}

export function saveExpense(payload) {
  return axios
    .post(BASE_URL + '/expenses', payload)
    .then(function(r) { return r.data; });
}

export function fetchExpenses() {
  return axios
    .get(BASE_URL + '/expenses')
    .then(function(r) { return r.data; });
}

export function deleteExpense(id) {
  return axios
    .delete(BASE_URL + '/expenses/' + String(id))
    .then(function(r) { return r.data; });
}