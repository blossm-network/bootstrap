const deps = require("./deps");

module.exports = async ({ root, payload, context, claims, aggregateFn }) => {
  // If there's nothing to upgrade to, dont save events.
  if (!Object.keys(payload).length) return {};

  // Get the aggregate for this session.
  const { aggregate: sessionAggregate } = await aggregateFn(root);

  // Check to see if this session has already been terminated.
  if (sessionAggregate.terminated)
    throw deps.badRequestError.message("This session is terminated.");

  const newContext = {
    ...context,
    ...payload,
  };

  const subject = claims.sub || payload.principle.root;

  // Create a new token inheriting from the current claims.
  const token = await deps.createJwt({
    options: {
      issuer: claims.iss,
      subject,
      audience: claims.aud,
      expiresIn: Date.parse(claims.exp) - deps.fineTimestamp(),
    },
    payload: {
      context: newContext,
    },
    signFn: deps.sign({
      ring: "jwt",
      key: "access",
      location: "global",
      version: "1",
      project: process.env.GCP_PROJECT,
    }),
  });

  return {
    events: [
      {
        root,
        action: "upgrade",
        payload,
      },
      ...(payload.principle
        ? [
            {
              root: payload.principle.root,
              domain: "principle",
              action: "add-roles",
              payload: {
                roles: [
                  {
                    id: "SessionAdmin",
                    root,
                    service: process.env.SERVICE,
                    network: process.env.NETWORK,
                  },
                ],
              },
            },
          ]
        : []),
    ],
    response: {
      tokens: [{ network: process.env.NETWORK, type: "access", value: token }],
      context: newContext,
    },
  };
};
