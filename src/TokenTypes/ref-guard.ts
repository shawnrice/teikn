const REF_RE = /^\{[^}]+\}$/;

export const assertNotRef = (input: unknown, typeName: string): void => {
  if (typeof input !== "string") {
    return;
  }
  const trimmed = input.trim();
  if (!REF_RE.test(trimmed)) {
    return;
  }
  throw new Error(
    `${typeName} cannot be constructed from a reference string ${trimmed}. ` +
      `References inside first-class value wrappers are not resolved. ` +
      `Either: (a) make the whole token value a reference (\`value: "${trimmed}"\` with no wrapper), ` +
      `or (b) use the plain composite-object form so the ref can be resolved per-field.`,
  );
};
