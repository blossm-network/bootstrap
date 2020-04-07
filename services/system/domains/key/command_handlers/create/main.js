const deps = require("./deps");

module.exports = async ({ payload, context }) => {
  const node = context.domain == "node" && context.node;

  if (!node)
    throw deps.forbiddenError.message("A key can only be made by a node.");

  const keyRoot = deps.uuid();
  const principleRoot = deps.uuid();

  const id = deps.randomStringOfLength(40);
  const secret = deps.randomStringOfLength(40);
  const hash = await deps.hash(secret);

  return {
    events: [
      {
        domain: "principle",
        service: "core",
        action: "add-roles",
        payload: {
          roles: payload.roles.map(role => {
            return {
              id: role,
              root: "some-tmp-root",
              service: process.env.SERVICE,
              network: process.env.NETWORK
            };
          })
        },
        root: principleRoot
      },
      {
        action: "create",
        payload: {
          name: payload.name,
          node,
          principle: {
            root: principleRoot,
            service: "core",
            network: process.env.NETWORK
          },
          id,
          secret: hash
        },
        root: keyRoot
      }
    ],
    response: { id, secret }
  };
};