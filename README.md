# Overview
Falcon is a security tool that can block application-level attacks in JavaScript. Falcon provides fine-grained insight and control on how application modules access sensitive information. This protects against users from threats that often originate in third-party and open source libraries.

Key features of Falcon:

- JavaScript Application Protection: alert or completely block most code injection vulnerabilities.
- Privilege Protection: automatically learn privileges used by an application. Using these privileges, block any application requests that violate privilege controls.
- Application Insight: unique instrumentation provides detailed information on libraries used in the application, whether they are directly or indirectly loaded at runtime, and the associated privileges of individual application libraries.
- Context Sensitivity: Unlike the experimental nodejs permissions model, Falcon allows privileges on a per-library or per-file basis. This allows the application to perform sensitive tasks with one module while protecting against vulnerabilities in others

**PLEASE NOTE**: This is an early version of Falcon. If you try it and run into issues, please email at contact@requiresecurity.com or open a github issue.

Known Issues:
- Only fs, http, https, net, and child_process APIs are fully covered
- Falcon does not propagate to worker threads/forks/etc

# Quickstart
If you would like to run on our provided demo program instead of your own app, follow the [`Demo` instructions here](docs/tutorial.md)

## Prerequisites
- node v16.20+
- python3 (if you want to self-host the dashboard)
- **node v20.8+ if you want to instrument an application that uses ES6 modules**

## Install
<ol type="1.">
  <li>Go to the root of the node project you would like to instrument</li>
  <li><code>npm install @reqsec/falcon-nodejs-instr</code></li>
  <li><code>export NODE_OPTIONS="--require @reqsec/falcon-nodejs-instr"</code>
  <ul>
    <li>If you would like to change the dashboard port (or any other settings) for the agent,
        edit <code>node_modules/@reqsec/falcon-nodejs-instr/dist/index.js</code></li>
</li>
  </ul>
  <li>(Re)start your application.</li>
  <li> Setup Dashboard</li>
    <ol type="a">
    <li>Remote Host</li>
    <ul>
      <li>Load the dashboard by going to <a href="https://falcon.requiresecurity.com">https://falcon.requiresecurity.com</a></li>
    </ul>
    <li>Self Host</li>
    <ul>
      <li>Download the dashboard from <a href="https://falcon.requiresecurity.com/falcon-dashboard.zip">https://falcon.requiresecurity.com/falcon-dashboard.zip</a></li>
      <li>unzip the dashboard and navigate into its directory</li>
      <li>run <code>python3 -m http.server 5173</code></li>
      <li>Load the dashboard by going to <code>localhost:5173</code> </li>
    </ul>
    </ol>
  <li> Configure host and click 'connect' in the dashboard landing page </li>
</ol>

## Learning
The top left status box should now show app status as `connected` and mode as `learning`.

Even without any input to your application, you should see libraries show up on the dashboard. Any library which your application loads will show up in the Libraries tab when it's loaded, and in the Privileges tab, you will be able to see the privileges used by said library as those privileges are exercised.

As your application receives inputs and does new things, new privileges (and new libraries, depending on your architecture) will show up on the dashboard.

Once you are satisfied with the displayed libraries and privileges, you can move to the Controls tab.

The `Export` button will export a trace of all instrumentation events the dashboard has received. It can be reloaded from the dashboard splash screen.

## Alerting
`Enable Alerting` will move Falcon from learning to alerting mode. This will
lock in the learned privileges as our privilege policy. Once in alerting mode,
you cannot move back to learning mode (without restarting the app), and unlike
learning mode, alerting mode will not add new privileges. Instead, if alerting
mode sees a privilege that violates policy, it will raise an alert, which will
show up in the Alerts tab.

From alerting mode, you can move back and forth between alerting and block
modes. In block mode, whenever an attempted privilege violation is detected, the
instrumentation will actually throw an error (thus preventing the violation) as well as logging a message.

If you see spurious events (or don't see fs, child_process, or network events that you expected to see), please file a bug on github or email contact@requiresecurity.com

# FAQ
### Which apps/frameworks are currently supported/should work?
| Name  | Status | Notes|
| ------------- | ------------- | ----- |
| Remix | Yes | |
| eslint | Yes | |
| ghost CMS | Yes | |
| totalJS CMS| Yes |  |
| express | Yes |  |
| Docusaurus | Yes | It's es6, so needs node 20.8+|
| Electron  | Partial  | Has been done internally but not published |
| NextJS | No | Should work if we can figure out how to instrument server|

# Contact
Falcon was pioneered at Aarno Labs in partnership with leading government research organizations, and has since transitioned to release under Require Security.

Require Security is a cyber security focused spinout of Aarno Labs, LLC.

Aarno Labs is a leading cyber security R&D company that specializes in solving extremely difficult computer security challenges by developing advanced automated techniques.

Visit us at [https://www.requiresecurity.com/](https://www.requiresecurity.com/) and [https://aarno-labs.com/](https://aarno-labs.com/)

For bug reports, please open github issues or email contact@requiresecurity.com
