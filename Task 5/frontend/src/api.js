import axios from 'axios';

export var BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

var CHUNK_SIZE = 1 * 1024 * 1024;

export async function uploadFileInChunks(file, onProgress) {
  var totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  var uploadId    = String(Date.now()) + '-' + Math.random().toString(36).slice(2);
  var fileId      = null;

  for (var i = 0; i < totalChunks; i++) {
    var start = i * CHUNK_SIZE;
    var end   = Math.min(start + CHUNK_SIZE, file.size);
    var chunk = file.slice(start, end);

    var form = new FormData();
    form.append('file',          chunk);
    form.append('upload_id',     uploadId);
    form.append('chunk_index',   String(i));
    form.append('total_chunks',  String(totalChunks));
    form.append('original_name', file.name);
    form.append('mime_type',     file.type || 'image/jpeg');

    var res = await axios.post(BASE_URL + '/upload-chunk', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    onProgress(Math.round(((i + 1) / totalChunks) * 100));

    if (res.data.done === true) {
      fileId = res.data.file_id;
    }
  }

  if (!fileId) throw new Error('No file_id returned after upload');
  return fileId;
}

export function scanReceipt(fileId) {
  return axios.post(BASE_URL + '/scan-receipt/' + String(fileId)).then(r => r.data);
}

export function saveExpense(payload) {
  return axios.post(BASE_URL + '/expenses', payload).then(r => r.data);
}

export function fetchExpenses(params) {
  var cleaned = {};
  var src = params || {};
  Object.keys(src).forEach(function (k) {
    var v = src[k];
    if (v !== undefined && v !== null && v !== '') cleaned[k] = v;
  });
  return axios.get(BASE_URL + '/expenses', { params: cleaned }).then(r => r.data);
}

export function deleteExpense(id) {
  return axios.delete(BASE_URL + '/expenses/' + String(id)).then(r => r.data);
}

export function deleteMultipleExpenses(ids) {
  return Promise.all(ids.map(id => deleteExpense(id)));
}