/* Gastos operativos e ingresos extra. Usan commerceChange como pedidos/ventas. */
function expenses() {
  const expenseRows = get('expenses');
  const incomeRows = get('incomes');
  $('#m').innerHTML = `<section id="expenses-ui">
    <h2>Gastos e ingresos</h2>
    <p class="s">Registrá gastos del taller (filamento comprado, envíos, herramientas, etc.) e ingresos que no vienen de una venta. Se reflejan en Estadísticas. Los pedidos y señas no se suman acá.</p>

    <div class="two">
      <form class="card" id="expense-form">
        <div class="title">Nuevo gasto</div>
        <div class="g">
          <label>Fecha<input name="date" type="date" required value="${localDate()}"></label>
          <label>Importe (AR$)<input name="amount" type="number" min="0.01" step="0.01" required></label>
        </div>
        <label style="margin-top:12px">Concepto / detalle<input name="name" required maxlength="250" placeholder="Ej: Rollo PLA negro, envío Correo Argentino"></label>
        <label style="margin-top:12px">Notas (opcional)<input name="notes" maxlength="500" placeholder="Opcional"></label>
        <button class="p" style="margin-top:14px" type="submit">Guardar gasto</button>
      </form>

      <form class="card" id="income-form">
        <div class="title">Ingreso extra</div>
        <div class="g">
          <label>Fecha<input name="date" type="date" required value="${localDate()}"></label>
          <label>Importe (AR$)<input name="amount" type="number" min="0.01" step="0.01" required></label>
        </div>
        <label style="margin-top:12px">Concepto / detalle<input name="name" required maxlength="250" placeholder="Ej: Reembolso, servicio de diseño, otro"></label>
        <label style="margin-top:12px">Notas (opcional)<input name="notes" maxlength="500" placeholder="Opcional"></label>
        <button class="p" style="margin-top:14px" type="submit">Guardar ingreso</button>
      </form>
    </div>

    <div id="expense-editor"></div>

    <div class="card">
      <div class="title">Gastos registrados <span style="color:var(--mu);font-weight:400;font-size:12px">(${expenseRows.length})</span></div>
      <div class="product-grid" id="expense-list"></div>
    </div>

    <div class="card">
      <div class="title">Ingresos extra <span style="color:var(--mu);font-weight:400;font-size:12px">(${incomeRows.length})</span></div>
      <div class="product-grid" id="income-list"></div>
    </div>
  </section>`;

  const drawExpenses = () => {
    const rows = get('expenses');
    $('#expense-list').innerHTML = rows.length
      ? rows.map((r, i) => {
          const amount = knownNumber(r.amount);
          return `<article class="product-card"><div class="product-body">
            <h3>${esc(r.name || 'Gasto')}</h3>
            <p>${esc(r.date || 'Sin fecha')}${r.notes ? ' · ' + esc(r.notes) : ''}</p>
            <dl><div><dt>Importe</dt><dd style="color:#f87171">${amount === null ? 'Sin registrar' : money2(amount)}</dd></div></dl>
            <div class="order-actions">
              <button class="s2" data-edit-expense="${i}">Editar</button>
              <button class="danger" data-delete-expense="${i}">Eliminar</button>
            </div>
          </div></article>`;
        }).join('')
      : '<p style="color:var(--mu)">Todavía no hay gastos.</p>';
    $('#expense-list').querySelectorAll('[data-edit-expense]').forEach(b => b.onclick = () => editExpense(Number(b.dataset.editExpense)));
    $('#expense-list').querySelectorAll('[data-delete-expense]').forEach(b => b.onclick = () => deleteExpense(Number(b.dataset.deleteExpense)));
  };

  const drawIncomes = () => {
    const rows = get('incomes');
    $('#income-list').innerHTML = rows.length
      ? rows.map((r, i) => {
          const amount = knownNumber(r.amount);
          return `<article class="product-card"><div class="product-body">
            <h3>${esc(r.name || 'Ingreso')}</h3>
            <p>${esc(r.date || 'Sin fecha')}${r.notes ? ' · ' + esc(r.notes) : ''}</p>
            <dl><div><dt>Importe</dt><dd style="color:#4ade80">${amount === null ? 'Sin registrar' : money2(amount)}</dd></div></dl>
            <div class="order-actions">
              <button class="s2" data-edit-income="${i}">Editar</button>
              <button class="danger" data-delete-income="${i}">Eliminar</button>
            </div>
          </div></article>`;
        }).join('')
      : '<p style="color:var(--mu)">Todavía no hay ingresos extra.</p>';
    $('#income-list').querySelectorAll('[data-edit-income]').forEach(b => b.onclick = () => editIncome(Number(b.dataset.editIncome)));
    $('#income-list').querySelectorAll('[data-delete-income]').forEach(b => b.onclick = () => deleteIncome(Number(b.dataset.deleteIncome)));
  };

  $('#expense-form').onsubmit = async e => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    const f = form.elements;
    const amount = Number(f.amount.value);
    const name = f.name.value.trim();
    const date = f.date.value;
    if (!name || !orderDateValid(date) || !Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100))) {
      return toast('Revisá fecha, concepto e importe del gasto.');
    }
    const row = {
      id: crypto.randomUUID(),
      date,
      name,
      amount: roundMoney(amount),
      notes: f.notes.value.trim(),
      updatedAt: new Date().toISOString()
    };
    await commerceChange(next => next.expenses.push(row), 'Gasto guardado', expenses);
  };

  $('#income-form').onsubmit = async e => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    const f = form.elements;
    const amount = Number(f.amount.value);
    const name = f.name.value.trim();
    const date = f.date.value;
    if (!name || !orderDateValid(date) || !Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100))) {
      return toast('Revisá fecha, concepto e importe del ingreso.');
    }
    const row = {
      id: crypto.randomUUID(),
      date,
      name,
      amount: roundMoney(amount),
      notes: f.notes.value.trim(),
      updatedAt: new Date().toISOString()
    };
    await commerceChange(next => next.incomes.push(row), 'Ingreso extra guardado', expenses);
  };

  drawExpenses();
  drawIncomes();
}

function editExpense(index) {
  const original = get('expenses')[index];
  if (!original || commerceBusy) return;
  const root = $('#expense-editor');
  root.innerHTML = `<form class="card" id="expense-edit-form">
    <h3>Editar gasto</h3>
    <div class="g">
      <label>Fecha<input name="date" type="date" required value="${esc(original.date || '')}"></label>
      <label>Importe (AR$)<input name="amount" type="number" min="0.01" step="0.01" required value="${knownNumber(original.amount) ?? ''}"></label>
    </div>
    <label style="margin-top:12px">Concepto / detalle<input name="name" required maxlength="250" value="${esc(original.name || '')}"></label>
    <label style="margin-top:12px">Notas (opcional)<input name="notes" maxlength="500" value="${esc(original.notes || '')}"></label>
    <div class="order-actions" style="margin-top:14px">
      <button class="p" type="submit">Guardar cambios</button>
      <button class="s2" type="button" id="expense-edit-cancel">Cancelar</button>
    </div>
  </form>`;
  $('#expense-edit-cancel').onclick = () => { root.innerHTML = ''; };
  $('#expense-edit-form').onsubmit = async e => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    const f = form.elements;
    const amount = Number(f.amount.value);
    const name = f.name.value.trim();
    const date = f.date.value;
    if (!name || !orderDateValid(date) || !Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100))) {
      return toast('Revisá fecha, concepto e importe.');
    }
    const updated = {
      ...original,
      date,
      name,
      amount: roundMoney(amount),
      notes: f.notes.value.trim(),
      updatedAt: new Date().toISOString()
    };
    await commerceChange(next => { next.expenses[index] = updated; }, 'Gasto actualizado', expenses);
  };
  root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  formFocus('expense-edit-form');
}

function editIncome(index) {
  const original = get('incomes')[index];
  if (!original || commerceBusy) return;
  const root = $('#expense-editor');
  root.innerHTML = `<form class="card" id="income-edit-form">
    <h3>Editar ingreso extra</h3>
    <div class="g">
      <label>Fecha<input name="date" type="date" required value="${esc(original.date || '')}"></label>
      <label>Importe (AR$)<input name="amount" type="number" min="0.01" step="0.01" required value="${knownNumber(original.amount) ?? ''}"></label>
    </div>
    <label style="margin-top:12px">Concepto / detalle<input name="name" required maxlength="250" value="${esc(original.name || '')}"></label>
    <label style="margin-top:12px">Notas (opcional)<input name="notes" maxlength="500" value="${esc(original.notes || '')}"></label>
    <div class="order-actions" style="margin-top:14px">
      <button class="p" type="submit">Guardar cambios</button>
      <button class="s2" type="button" id="income-edit-cancel">Cancelar</button>
    </div>
  </form>`;
  $('#income-edit-cancel').onclick = () => { root.innerHTML = ''; };
  $('#income-edit-form').onsubmit = async e => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    const f = form.elements;
    const amount = Number(f.amount.value);
    const name = f.name.value.trim();
    const date = f.date.value;
    if (!name || !orderDateValid(date) || !Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100))) {
      return toast('Revisá fecha, concepto e importe.');
    }
    const updated = {
      ...original,
      date,
      name,
      amount: roundMoney(amount),
      notes: f.notes.value.trim(),
      updatedAt: new Date().toISOString()
    };
    await commerceChange(next => { next.incomes[index] = updated; }, 'Ingreso actualizado', expenses);
  };
  root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  formFocus('income-edit-form');
}

async function deleteExpense(index) {
  if (commerceBusy) return;
  const row = get('expenses')[index];
  if (!row) return;
  if (!confirm(`¿Eliminar el gasto "${row.name || 'sin nombre'}" por ${money2(Number(row.amount) || 0)}? Se quitará del balance.`)) return;
  await commerceChange(next => { next.expenses.splice(index, 1); }, 'Gasto eliminado', expenses);
}

async function deleteIncome(index) {
  if (commerceBusy) return;
  const row = get('incomes')[index];
  if (!row) return;
  if (!confirm(`¿Eliminar el ingreso "${row.name || 'sin nombre'}" por ${money2(Number(row.amount) || 0)}? Se quitará del balance.`)) return;
  await commerceChange(next => { next.incomes.splice(index, 1); }, 'Ingreso eliminado', expenses);
}

function formFocus(id) {
  const el = document.getElementById(id);
  if (el?.elements?.name) el.elements.name.focus();
}
