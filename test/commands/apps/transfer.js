'use strict';

let cmd;
let inquirer      = {};
let stubGet       = require('../../stub/get');
let stubPost      = require('../../stub/post');
let stubPatch     = require('../../stub/patch');
let proxyquire    = require('proxyquire').noCallThru();
let unwrap        = require('../../unwrap');

describe('heroku apps:transfer', () => {
  beforeEach(() => {
    cli.mockConsole();
    inquirer = {};
    cmd = proxyquire('../../../commands/apps/transfer', {inquirer});
  });

  afterEach(()  => nock.cleanAll());

  context('when transferring in bulk', () => {
    beforeEach(() => {
      stubGet.apps();
    });

    it('transfers selected apps to a team', () => {
      inquirer.prompt = (prompts) => {
        let choices = prompts[0].choices;
        expect(choices).to.eql([
          { name: 'my-org-app (organization)', value: 'my-org-app' },
          { name: 'my-team-app (team)', value: 'my-team-app' },
          { name: 'myapp (foo@foo.com)', value: 'myapp' }
        ]);
        return Promise.resolve({choices: ['myapp']});
      };

      let api = stubPatch.orgAppTransfer();
      return cmd.run({args: {recipient: 'team'}, flags: {bulk: true}})
      .then(function() {
        api.done();
        expect(cli.stdout).to.equal('Transferring applications to team\n');
        expect(unwrap(cli.stderr)).to.equal('myapp... done\n');
      });
    });

    it('transfers selected apps to a personal account', () => {
      inquirer.prompt = (prompts) => {
        let choices = prompts[0].choices;
        expect(choices).to.eql([
          { name: 'my-org-app (organization)', value: 'my-org-app' },
          { name: 'my-team-app (team)', value: 'my-team-app' },
          { name: 'myapp (foo@foo.com)', value: 'myapp' }
        ]);
        return Promise.resolve({choices: ['myapp']});
      };

      let api = stubPatch.personalAppTransfer();
      return cmd.run({args: {recipient: 'raulb@heroku.com'}, flags: {bulk: true}})
      .then(function() {
        api.done();
        expect(cli.stdout).to.equal('Transferring applications to raulb@heroku.com\n');
        expect(unwrap(cli.stderr)).to.equal('myapp... done\n');
      });
    });
  });

  context('when it is a personal app', () => {
    beforeEach(() => {
      stubGet.personalApp();
    });

    it('transfers the app to a personal account', () => {
      let api = stubPost.personalAppTransfer();
      return cmd.run({app: 'myapp', args: {recipient: 'foo@foo.com'}, flags: {}})
      .then(() => expect(``).to.eq(cli.stdout))
      .then(() => expect(`Initiating transfer of myapp to foo@foo.com... email sent\n`).to.eq(cli.stderr))
      .then(() => api.done());
    });

    it('transfers the app to an organization', () => {
      let api = stubPatch.orgAppTransfer();
      return cmd.run({app: 'myapp', args: {recipient: 'team'}, flags: {}})
      .then(() => expect(``).to.eq(cli.stdout))
      .then(() => expect(`Transferring myapp to team... done\n`).to.eq(cli.stderr))
      .then(() => api.done());
    });
  });

  context('when it is an org app', () => {
    beforeEach(() => {
      stubGet.orgApp();
    });

    it('transfers the app to a personal account', () => {
      let api = stubPatch.orgAppTransfer();
      return cmd.run({app: 'myapp', args: {recipient: 'team'}, flags: {}})
      .then(() => expect(``).to.eq(cli.stdout))
      .then(() => expect(`Transferring myapp to team... done\n`).to.eq(cli.stderr))
      .then(() => api.done());
    });

    it('transfers the app to an organization', () => {
      let api = stubPatch.orgAppTransfer();
      return cmd.run({app: 'myapp', args: {recipient: 'team'}, flags: {}})
      .then(() => expect(``).to.eq(cli.stdout))
      .then(() => expect(`Transferring myapp to team... done\n`).to.eq(cli.stderr))
      .then(() => api.done());
    });

    it('transfers and locks the app if --locked is passed', () => {
      let api = stubPatch.personalAppTransfer();

      let locked_api = nock('https://api.heroku.com:443')
      .get('/organizations/apps/myapp')
      .reply(200, {name: 'myapp', locked: false})
      .patch('/organizations/apps/myapp', {locked: true})
      .reply(200);

      return cmd.run({app: 'myapp', args: {recipient: 'raulb@heroku.com'}, flags: {locked: true}})
      .then(() => expect(``).to.eq(cli.stdout))
      .then(() => expect(`Transferring myapp to raulb@heroku.com... done\nLocking myapp... done\n`).to.eq(cli.stderr))
      .then(() => api.done())
      .then(() => locked_api.done());
    });
  });
});
