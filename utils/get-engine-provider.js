'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * @typedef {Object} EngineProvider
 * @property {string} name - docker-desktop, orbstack or rancher
 * @property {string} app - the macOS app bundle that runs the engine
 * @property {string} socketPath - the docker socket the engine serves
 * @property {string[]} [start] - command that starts the engine, absent for docker-desktop which has its own logic
 */

/**
 * Resolves which container engine Lando drives on macOS.
 *
 * `auto` keeps the historical behavior: Docker Desktop if it is installed,
 * otherwise the first of OrbStack or Rancher Desktop that is.
 *
 * @param {string} [name='auto'] - auto, docker-desktop, orbstack or rancher
 * @param {Object} [opts] - home dir and an exists(path) check, injectable for tests
 * @return {EngineProvider} The resolved provider.
 */
module.exports = (name = 'auto', {home = os.homedir(), exists = fs.existsSync} = {}) => {
  // start uses each engine's own cli: re-opening an app whose engine was stopped (but whose menu bar app still runs)
  // is a no-op, so `open -a` cannot be relied on to bring the engine back
  const providers = {
    'docker-desktop': {app: '/Applications/Docker.app', socketPath: '/var/run/docker.sock'},
    'orbstack': {
      app: '/Applications/OrbStack.app',
      socketPath: path.join(home, '.orbstack', 'run', 'docker.sock'),
      start: ['/Applications/OrbStack.app/Contents/MacOS/bin/orbctl', 'start'],
    },
    // rancher must run in dockerd (moby) mode, containerd mode cannot run lando
    'rancher': {
      app: '/Applications/Rancher Desktop.app',
      socketPath: path.join(home, '.rd', 'docker.sock'),
      start: ['/Applications/Rancher Desktop.app/Contents/Resources/resources/darwin/bin/rdctl', 'start'],
    },
  };

  if (name === 'auto') name = Object.keys(providers).find(key => exists(providers[key].app)) ?? 'docker-desktop';
  if (!providers[name]) {
    throw new Error(`Unknown engineProvider "${name}", use one of auto, ${Object.keys(providers).join(', ')}`);
  }

  return {name, ...providers[name]};
};
