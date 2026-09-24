// Demo-only play-money wallet client. The demo adapter (src/demo/demoAdapter.ts) holds the balance;
// games talk to it through postMessage. Real operator games use only the acehall-game messages.
(function () {
  var params = new URLSearchParams(location.search);
  var locale = params.get('locale') || 'en';
  var pending = {};
  var nextId = 0;
  var badge = document.createElement('div');
  badge.className = 'badge';
  badge.textContent = 'DEMO · PLAY MONEY';
  var balanceEl = document.createElement('div');
  balanceEl.className = 'balance';
  document.body.append(badge, balanceEl);

  function show(balance) {
    balanceEl.textContent = new Intl.NumberFormat(locale, { style: 'currency', currency: 'GEL' }).format(balance);
  }
  function send(type, payload) {
    return new Promise(function (resolve) {
      var id = ++nextId;
      pending[id] = resolve;
      parent.postMessage(Object.assign({ source: 'acehall-demo-game', type: type, id: id }, payload), location.origin);
    }).then(function (reply) {
      show(reply.balance);
      return reply;
    });
  }
  function balanceChanged() {
    parent.postMessage({ source: 'acehall-game', type: 'balance_changed' }, location.origin);
  }
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (e.origin !== location.origin || e.source !== parent || !d || d.source !== 'acehall-demo') return;
    var resolve = pending[d.id];
    if (resolve) { delete pending[d.id]; resolve(d); }
  });

  window.Wallet = {
    locale: locale,
    params: params,
    t: function (dict) { return dict[locale] || dict.en; },
    hello: function () { return send('hello', {}); },
    /** Resolves { ok, balance }. ok is false when the balance is too low. */
    bet: function (amount) { return send('bet', { amount: amount }).then(function (r) { if (r.ok) balanceChanged(); return r; }); },
    payout: function (amount) { return send('payout', { amount: amount }).then(function (r) { balanceChanged(); return r; }); },
  };
  window.Wallet.hello();
})();
