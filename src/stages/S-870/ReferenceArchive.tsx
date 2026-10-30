import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import FolderOpenOutlined from "@mui/icons-material/FolderOpenOutlined";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import { useState } from "react";
import type { Locale } from "../../i18n";
import { stageText } from "../locale";
import { referenceFiles } from "./files";
import { locale } from "./locale";

export function ReferenceArchive({ language }: { language: Locale }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<keyof typeof referenceFiles | null>(
    null,
  );
  const Folder = open ? FolderOpenOutlined : FolderOutlined;
  return (
    <section
      className="s870-reference"
      aria-label={stageText(language, locale.reference)}
    >
      <header>
        <span aria-hidden="true">● ● ●</span>
        <strong>{stageText(language, locale.reference)}</strong>
      </header>
      <button
        type="button"
        className="s870-folder"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          setSelected(null);
        }}
      >
        <Folder aria-hidden="true" /> archive
      </button>
      {open ? (
        <div className="s870-browser">
          <ul>
            {(
              Object.keys(referenceFiles) as (keyof typeof referenceFiles)[]
            ).map((name) => (
              <li key={name}>
                <button
                  type="button"
                  aria-pressed={selected === name}
                  onClick={() => setSelected(name)}
                >
                  <DescriptionOutlined aria-hidden="true" />
                  {name}
                </button>
              </li>
            ))}
          </ul>
          <div className="s870-document">
            {selected ? (
              <article aria-label={selected}>
                <h3>{selected}</h3>
                <pre>{referenceFiles[selected]}</pre>
                <small>{stageText(language, locale.format)}</small>
              </article>
            ) : (
              <DescriptionOutlined
                className="s870-file-placeholder"
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
