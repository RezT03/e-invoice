function deleteInvoice(id) {
  if (confirm('Yakin ingin menghapus invoice ini?')) {
    fetch(`/invoice/delete/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(res => { if (res.success) location.reload(); });
  }
}
function editStatus(id) {
  const status = prompt('Masukkan status baru: lunas, belum dibayar, dibayar sebagian');
  if (status) {
    fetch(`/invoice/status/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }).then(() => location.reload());
  }
}
function editInvoice(id) {
  alert('Fitur edit invoice menyusul dalam pengembangan selanjutnya.');
}