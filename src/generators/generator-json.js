export const generateToken = token => {
  const { name, ...values } = token;
  return { [name]: values };
};

export const combinator = tokens => {
  const combined = tokens.reduce((acc, token) => Object.assign(acc, token), {});
  return JSON.stringify(combined, null, 2);
};

export const generator = tokens => combinator(tokens.map(generateToken));
