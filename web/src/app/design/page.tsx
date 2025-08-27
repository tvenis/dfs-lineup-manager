import Image from "next/image";

export default function DesignPreview() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Figma Snapshot</h1>
      <div className="grid gap-6 sm:grid-cols-2">
        <figure className="space-y-2">
          <Image src="/figma/thumbnail.png" alt="Figma thumbnail" width={400} height={353} />
          <figcaption className="text-xs text-black/60 dark:text-white/60">thumbnail</figcaption>
        </figure>
        <figure className="space-y-2">
          <Image src="/figma/canvas.png" alt="Figma canvas" width={704} height={622} />
          <figcaption className="text-xs text-black/60 dark:text-white/60">canvas</figcaption>
        </figure>
      </div>
    </div>
  );
}


