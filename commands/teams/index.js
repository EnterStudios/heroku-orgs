'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let Utils = require('../../lib/utils')

function * run (context, heroku) {
  let orgs = yield heroku.get('/organizations')
  let teams = orgs.filter(o => o.type === 'team')
  if (context.flags.json) Utils.printGroupsJSON(teams)
  else Utils.printGroups(teams, {label: 'Teams'})
}
module.exports = {
  topic: 'teams',
  description: 'list the teams that you are a member of',
  needsAuth: true,
  flags: [
    {name: 'json', description: 'output in json format'}
  ],
  run: cli.command(co.wrap(run))
}