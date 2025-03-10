// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("EmptyModule", (m) => {
  //const unlockTime = m.getParameter("unlockTime", JAN_1ST_2030);
  //const lockedAmount = m.getParameter("lockedAmount", ONE_GWEI);

  const empty = m.contract("Empty", [], {});

  return { empty };
});
