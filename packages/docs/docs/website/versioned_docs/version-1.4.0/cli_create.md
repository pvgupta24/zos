---
id: version-1.4.0-cli_create
title: create
original_id: cli_create
---

<div class="cli-command"><h2 class="cli-title">create</h2><p class="cli-usage">Usage: <code>create &lt;alias&gt; --network &lt;network&gt; [options]</code></p><p>deploys a new upgradeable contract instance. Provide the &lt;alias&gt; you added your contract with<br/></p><dl><dt><span>Options:</span></dt><dd><div><code>--init [function]</code> call function after creating contract. If none is given, &#x27;initialize&#x27; will be used</div><div><code>--args &lt;arg1, arg2, ...&gt;</code> provide initialization arguments for your contract if required</div><div><code>--force</code> force creation even if contracts have local modifications</div><div><code>-n, --network &lt;network&gt;</code> network to be used</div><div><code>-f, --from &lt;from&gt;</code> specify transaction sender address</div><div><code>--timeout &lt;timeout&gt;</code> timeout in seconds for each blockchain transaction (defaults to 600s)</div></dd></dl></div>
