# Prerequisites
- node v16.20+
- npm v8.19+
- python3 (if you want to self-host the dashboard)
# Setup
<ol type="1.">
  <li>Install falcon in a new folder:</li>

  ```bash
  mkdir -p falcon_demo/node_modules
  cd falcon_demo
  npm install @reqsec/falcon-nodejs-instr
  ```
  <li>Start the demo app:</li>

  ```bash
  cd node_modules/@reqsec/falcon-nodejs-instr
  node ./demos/webserver/webserver.js
  ```
  The demo app will create a webpage at `localhost:8124` and will broadcast its permission events to  `localhost:4567`

 <li> Setup Dashboard
    <ol type="a">
    <li>Remote Host</li>
    <ul>
      <li>Load the dashboard by going to <a href="https://falcon.requiresecurity.com">https://falcon.requiresecurity.com</a> ¹</li>
    </ul>
    <li>Self Host</li>
    <ul>
      <li>Download the dashboard from <a href="https://falcon.requiresecurity.com/falcon-dashboard.zip">https://falcon.requiresecurity.com/falcon-dashboard.zip</a></li>
      <li>unzip the dashboard and navigate into its directory</li>
      <li>run <code>python3 -m http.server 5173</code></li>
      <li>Load the dashboard by going to <code>localhost:5173</code> </li>
    </ul>
    </ol>
  <li> Set the host to <code>localhost</code> and the port to <code>4567</code> and click 'connect' in the dashboard landing page </li>
</ol>
<br/>

# Run
## Learning
The top left status box should now show app status as `connected` and mode as `learning`.

You should be looking at the Libraries tab. There should be one library: `webserver-demo`.

If you go to the Privileges pane, there are two tables: Privileges By Library and Privileges By Call. Privileges By Library should have one library (`webserver-demo`) with http and file privileges. Privileges By Call should have three permissions, for `http.createServer`, `net.Server.listen`, and `fs.truncateSync`. These are all API calls that happen when the server is set up, so they will already be there

- Now (in a separate tab), go to `localhost:8124`. This is the demo webserver.
- Submit some benign data.

The html will be read via `fs.createReadStream`, and benign data will be written to a file via `fs.appendFile`. If you go back to the dashboard, you will see two new entries in Privileges By Call

- Back in the dashboard, go to the Control pane.

The `Export` button will export a trace of all instrumentation events the dashboard has received. If you'd like a record of the permissions so far, hit "Export"

- Turn `Enable Alerting` on.

## Alerting
Enable Alerting` will move Falcon from learning to alerting mode. This will lock
in the learned privileges as our privilege policy. Once in alerting mode, you
cannot move back to learning mode (without restarting the app), and unlike
learning mode, alerting mode will not add new privileges. Instead, if alerting
mode sees a privilege that violates policy, it will raise an alert, which will
show up in the Alerts tab.

- Go to the demo webserver and submit the exploit JSON string

This exploit will take advantage of the extremely lax nature of the demo server
(we just eval all the inputs) to run an arbitrary command (in this case `require('node:child_process').execSync('touch /tmp/exploit')` --> `touch /tmp/exploit`)

- Go to the Alerts pane. There will now be one alert for `exec`

Because the webserver does not have exec permissions, there will be an alert waiting for us in the Alerts pane. Because we are in alerting mode, this permissions violation was recorded for further action, but the offending call went through.

- run `file /tmp/exploit`

This will show that there is a new, empty file there, injected by an outside(ish) attacker(ish).

- run `rm /tmp/exploit` to remove the offending file

If we want to prevent this, and not just deal with it after the fact, we can move to blocking mode:

- Go to the Control pane
- Change Privilege Violations from Allow to Block

## Blocking
Unlike the transition between learning and alerting, we can freely transition back and forth between alerting and blocking. For now, we will stay in blocking mode.

- Go to the demo webserver and submit the exploit JSON string

This time, when the exploit tries to run exec, Falcon will block the permissions violation. The webserver will report an error, and if we check `/tmp/exploit` again, it won't be there. As before, there will be an alert for the violation, this time with outcome 'block'.

-------------------

¹This will simply serve you the static webpage -- no instrumentation information will be sent off your machine
