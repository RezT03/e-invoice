document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('invoiceForm').addEventListener('submit', e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = Object.fromEntries(form.entries());

    const items = Array.from(document.querySelectorAll('#items tr')).map(row => {
      const [name, qty, unit, price] = Array.from(row.querySelectorAll('input')).map(i => i.value);
      return { name, qty: +qty, unit, unit_price: +price };
    });

    const taxes = Array.from(document.querySelectorAll('#taxes tr')).map(row => {
      const [name, percent] = Array.from(row.querySelectorAll('input')).map(i => i.value);
      return { name, percent: +percent };
    });

    data.items = items;
    data.taxes = taxes;

    fetch('/invoice/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(res => { if (res.success) location.href = `/invoice/${res.id}` });
  });
});

function addItem() {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text" required></td>
    <td><input type="number" required></td>
    <td><input type="text" required></td>
    <td><input type="number" required oninput="updateTotal(this)"></td>
    <td><span class="total">0</span></td>
  `;
  document.getElementById('items').appendChild(row);
}

function updateTotal(input) {
  const row = input.closest('tr');
  const qty = row.children[1].querySelector('input').value;
  const price = input.value;
  row.querySelector('.total').textContent = qty * price;
}

function addTax() {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text" required></td>
    <td><input type="number" required></td>
  `;
  document.getElementById('taxes').appendChild(row);
}
