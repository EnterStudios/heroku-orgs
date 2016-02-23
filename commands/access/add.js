'use strict';

let cli           = require('heroku-cli-util');
let Utils         = require('../../lib/utils');
let co            = require('co');

function* run(context, heroku) {
  let appName = context.app;
  let privileges = context.flags.privileges || 'view'; // Defaults to view only
  let appInfo = yield heroku.apps(appName).info();
  let output = `Adding ${cli.color.cyan(context.args.email)} access to the app ${cli.color.magenta(appName)}`;
  let request;

  if (Utils.isOrgApp(appInfo.owner.email)) {
    request = heroku.request({
      method: 'POST',
      path: `/organizations/apps/${appName}/collaborators`,
      headers: {
        Accept: 'application/vnd.heroku+json; version=3.org-privileges',
      },
      body: {
        user: context.args.email,
        privileges: privileges.split(",")
      }
    });

    let orgName = Utils.getOwner(appInfo.owner.email);
    let orgInfo = yield heroku.request({
      method: 'GET',
      path: `/v1/organization/${orgName}`,
      headers: { Accept: 'application/vnd.heroku+json; version=2' }
    });
    if (orgInfo.flags.indexOf('org-access-controls') !== -1) { output += ` with ${cli.color.green(privileges)} privileges`; }

  } else {
    request = yield heroku.apps(appName).collaborators().create({ user: context.args.email });
  }
  yield cli.action(`${output}`, request);
}

module.exports = {
  topic: 'access',
  needsAuth: true,
  needsApp: true,
  command: 'add',
  description: 'Add new users to your app',
  help: 'heroku access:add user@email.com --app APP # Add a collaborator to your app\n\nheroku access:add user@email.com --app APP --privileges view, deploy, manage, operate # privileges must be comma separated',
  args: [{name: 'email', optional: false}],
  flags: [
    {name: 'privileges', description: 'list of privileges comma separated', hasValue: true, optional: true}
  ],
  run: cli.command(co.wrap(run))
};
