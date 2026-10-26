/** Tile the existing texture as a decorative SVG filter, not a large image candidate. */
export function MapPaper({ id }: { id: string }) {
  return <svg className="map-paper" aria-hidden="true" width="100%" height="100%">
    <defs><filter id={id} x="0" y="0" width="100%" height="100%" primitiveUnits="userSpaceOnUse">
      <feImage href="/assets/paper-grain.png" x="0" y="0" width="256" height="256" result="grain" />
      <feTile in="grain" />
    </filter></defs>
    <rect width="100%" height="100%" filter={`url(#${id})`} />
  </svg>;
}
