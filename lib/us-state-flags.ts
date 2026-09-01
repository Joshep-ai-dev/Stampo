export function getUsStateFlagUrl(stateName: string) {
  const name = stateName.trim();
  if (!name) return undefined;

  const fileName = name.toLocaleLowerCase("en-US") === "georgia"
    ? "Flag_of_Georgia_(U.S._state).svg"
    : `Flag_of_${name.replace(/\s+/g, "_")}.svg`;

  return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(fileName)}?width=160`;
}
