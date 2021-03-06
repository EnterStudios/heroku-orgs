'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let extend = require('util')._extend
let Utils = require('../../lib/utils')

function * run (context, heroku) {
  let orgInfo = yield Utils.orgInfo(context, heroku)
  let groupName = context.org || context.flags.team

  // Users receive `You'll be billed monthly for teams over 5 members.`
  const warnMembershipLimit = function * (totalMembers) {
    const FREE_TEAM_LIMIT = 6
    if (totalMembers === FREE_TEAM_LIMIT) {
      cli.warn("You'll be billed monthly for teams over 5 members.")
    }
  }

  let addMemberToOrg = function * (email, role, groupName) {
    let request = heroku.request({
      method: 'PUT',
      path: `/organizations/${groupName}/members`,
      body: {email, role}
    })
    yield cli.action(`Adding ${cli.color.cyan(email)} to ${cli.color.magenta(groupName)} as ${cli.color.green(role)}`, request)
  }

  let inviteMemberToTeam = function * (email, role, groupName) {
    let request = heroku.request({
      headers: {
        Accept: 'application/vnd.heroku+json; version=3.team-invitations'
      },
      method: 'PUT',
      path: `/organizations/${groupName}/invitations`,
      body: {email, role}
    }).then(request => {
      cli.action.done('email sent')
    })

    yield cli.action(`Inviting ${cli.color.cyan(email)} to ${cli.color.magenta(groupName)} as ${cli.color.green(role)}`, request)
  }

  let email = context.args.email
  let role = context.flags.role

  let groupFeatures = yield heroku.get(`/organizations/${groupName}/features`)

  if (groupFeatures.find(feature => { return feature.name === 'team-invite-acceptance' && feature.enabled })) {
    yield inviteMemberToTeam(email, role, groupName)
  } else {
    yield addMemberToOrg(email, role, groupName)
  }

  if (orgInfo.type === 'team') {
    let membersAndInvites = yield co(function * () {
      return yield {
        invites: heroku.request({
          headers: {
            Accept: 'application/vnd.heroku+json; version=3.team-invitations'
          },
          method: 'GET',
          path: `/organizations/${groupName}/invitations`
        }),
        members: heroku.get(`/organizations/${groupName}/members`)
      }
    })
    const membersCount = membersAndInvites.invites.length + membersAndInvites.members.length
    yield warnMembershipLimit(membersCount)
  }

  Utils.warnUsingOrgFlagInTeams(orgInfo, context)
}

let cmd = {
  topic: 'members',
  command: 'add',
  description: 'adds a user to an organization or a team',
  needsAuth: true,
  wantsOrg: true,
  args: [{name: 'email'}],
  flags: [
    {name: 'role', char: 'r', hasValue: true, required: true, description: 'member role (admin, collaborator, member, owner)'},
    {name: 'team', char: 't', hasValue: true, description: 'team to use'}
  ],
  run: cli.command(co.wrap(run))
}

module.exports.add = cmd
module.exports.set = extend({}, cmd)
module.exports.set.command = 'set'
module.exports.set.description = 'sets a members role in an organization or a team'
