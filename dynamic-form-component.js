// Vanilla dynamic form as a Web Component (no React).
// Usage:
//  <dynamic-form
//       id="myForm"
//       fields='[{"id":"name","label":"Name","type":"text","required":true}]'
//       action="/submit"
//       method="POST"
//       json="true" // optional: send as JSON when true, otherwise send as FormData
//       btn-label="Submit"
//  ></dynamic-form>
// Then listen for events: 'form-submitted', 'form-success', 'form-error'.

class DynamicForm extends HTMLElement {
  constructor() {
    super();
    this.renderRoot = this.attachShadow({ mode: 'open' });
    this.fields = [];
    this.action = '';
    this.method = 'POST';
    this.encodeJson = false;
    this.btnLabel = 'Submit';
    this.form = null;
    this.handleSubmitBound = this.handleSubmit.bind(this);
  }

  static get observedAttributes() {
    return ['fields', 'action', 'method', 'json', 'btn-label'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.parseAttributes();
      this.render();
    }
  }

  connectedCallback() {
    this.parseAttributes();
    this.render();
  }

  parseAttributes() {
    const fieldsAttr = this.getAttribute('fields');
    if (fieldsAttr) {
      try {
        const parsed = JSON.parse(fieldsAttr);
        this.fields = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('DynamicForm: invalid fields JSON', e);
        this.fields = [];
      }
    } else {
      this.fields = [];
    }

    this.action = this.getAttribute('action') || '';
    this.method = (this.getAttribute('method') || 'POST').toUpperCase();
    // If json attr exists and is not 'false', encode as JSON
    this.encodeJson = this.hasAttribute('json') && this.getAttribute('json') !== 'false';
    this.btnLabel = this.getAttribute('btn-label') || 'Submit';
  }

  render() {
    // Clear renderRoot
    while (this.renderRoot.firstChild) this.renderRoot.removeChild(this.renderRoot.firstChild);

    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; }
      form { display: grid; gap: 0.75rem; padding: 0.5rem; }
      .field { display: grid; gap: 0.25rem; }
      label { font-weight: 600; }
      input, textarea, select { width: 100%; padding: 0.5rem; border: 1px solid #d0d7de; border-radius: 4px; font: inherit; }
      .error { color: #d00; font-size: 0.85em; min-height: 1em; }
      .row { display: flex; gap: 0.5rem; align-items: center; justify-content: flex-start; }
      button { padding: 0.6rem 1rem; border: none; border-radius: 6px; background: #2b6cb0; color: white; cursor: pointer; }
      button[disabled] { opacity: 0.6; cursor: not-allowed; }
      @media (max-width: 600px) { .row { flex-direction: column; align-items: stretch; } }
    `;
    this.renderRoot.appendChild(style);

    const form = document.createElement('form');
    form.setAttribute('novalidate', 'true');
    form.addEventListener('submit', this.handleSubmitBound);

    const fields = (this.fields && this.fields.length) ? this.fields : [
      { id: 'name', label: 'Name', type: 'text', required: true },
      { id: 'email', label: 'Email', type: 'email', required: true }
    ];

    fields.forEach(f => {
      const fieldWrapper = document.createElement('div');
      fieldWrapper.className = 'field';

      const label = document.createElement('label');
      label.htmlFor = f.id;
      label.textContent = f.label + (f.required ? ' *' : '');

      let input;
      if (f.type === 'textarea') {
        input = document.createElement('textarea');
      } else if (f.type === 'select') {
        input = document.createElement('select');
        if (Array.isArray(f.options)) {
          f.options.forEach(opt => {
            const optEl = document.createElement('option');
            optEl.value = opt.value;
            optEl.textContent = opt.label;
            input.appendChild(optEl);
          });
        }
      } else {
        input = document.createElement('input');
        input.type = f.type || 'text';
      }
      input.id = f.id;
      input.name = f.id;
      if (f.placeholder) input.placeholder = f.placeholder;
      if (f.required) input.required = true;

      const error = document.createElement('span');
      error.className = 'error';
      error.setAttribute('aria-live', 'polite');

      fieldWrapper.appendChild(label);
      fieldWrapper.appendChild(input);
      fieldWrapper.appendChild(error);
      form.appendChild(fieldWrapper);
    });

    const actionsRow = document.createElement('div');
    actionsRow.className = 'row';
    const btn = document.createElement('button');
    btn.type = 'submit';
    btn.textContent = this.btnLabel; 
    actionsRow.appendChild(btn);
    form.appendChild(actionsRow);

    this.form = form;
    this.renderRoot.appendChild(form);
  }

  handleSubmit(event) {
    if (event) event.preventDefault();
    const form = this.form;
    if (!form) return;

    // Native validation
    if (!form.checkValidity()) {
      form.reportValidity();
      const firstInvalid = form.querySelector(':invalid');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Collect data
    const fd = new FormData(form);
    const data = {};
    for (const [k, v] of fd.entries()) data[k] = v;

    // Events
    this.dispatchEvent(new CustomEvent('form-submitted', { detail: data }));

    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true; // loading state

    if (this.action) {
      const payloadJson = this.encodeJson;
      const url = this.action;
      const headers = payloadJson ? { 'Content-Type': 'application/json' } : {};
      const body = payloadJson ? JSON.stringify(data) : new FormData(form);

      fetch(url, {
        method: this.method,
        headers,
        body
      }).then(res => {
        const contentType = res.headers.get('Content-Type') || '';
        if (payloadJson && contentType.includes('application/json')) {
          return res.json().then(json => {
            if (btn) btn.disabled = false;
            this.dispatchEvent(new CustomEvent('form-success', { detail: { data, resp: json } }));
          }).catch(() => {
            if (btn) btn.disabled = false;
            this.dispatchEvent(new CustomEvent('form-success', { detail: { data, resp: { status: res.status } } }));
          });
        } else {
          if (btn) btn.disabled = false;
          this.dispatchEvent(new CustomEvent('form-success', { detail: { data, resp: { status: res.status } } }));
        }
      }).catch(err => {
        if (btn) btn.disabled = false;
        this.dispatchEvent(new CustomEvent('form-error', { detail: { data, error: err } }));
      });
    } else {
      // No action URL: just report submission
      if (btn) btn.disabled = false;
      this.dispatchEvent(new CustomEvent('form-submitted', { detail: data }));
    }
  }
}

customElements.define('dynamic-form', DynamicForm);
export default DynamicForm;
