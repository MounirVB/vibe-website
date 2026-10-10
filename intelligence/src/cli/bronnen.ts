#!/usr/bin/env node
/* ============================================================
   CLI — bronnen
   ------------------------------------------------------------
     npm run bronnen -- --lijst            register tonen
     npm run bronnen -- --controleer       alleen structuurcontrole
     npm run bronnen -- --verifieer        robots + toestemming meten
     npm run bronnen -- --verifieer --haal ook echt ophalen en parseren
     npm run bronnen -- --bron <sleutel>   beperk tot één bron
   ============================================================ */

import { BRONNEN, GEMETEN_OP, bronOpSleutel } from "../bronnen/register.ts";
import { controleerBron } from "../bronnen/soorten.ts";
import { verifieerBron } from "../bronnen/verifieer.ts";

const heeft = (naam: string) => process.argv.includes(`--${naam}`);
function argument(naam: string): string | undefined {
  const i = process.argv.indexOf(`--${naam}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function kolom(tekst: string, breedte: number): string {
  if (tekst.length <= breedte) return tekst.padEnd(breedte);
  return `${tekst.slice(0, breedte - 1)}…`;
}

async function main(): Promise<number> {
  const sleutel = argument("bron");
  const selectie = sleutel
    ? (() => {
        const b = bronOpSleutel(sleutel);
        if (!b) {
          process.stderr.write(`onbekende bron: ${sleutel}\n`);
          process.exit(2);
        }
        return [b];
      })()
    : BRONNEN;

  if (heeft("lijst") || process.argv.length <= 2) {
    process.stdout.write(`BRONREGISTER — gemeten op ${GEMETEN_OP}\n\n`);
    process.stdout.write(
      `${kolom("SLEUTEL", 32)} ${kolom("SOORT", 11)} ${kolom("AAN", 4)} ${kolom("ROBOTS", 11)} ${kolom("TDM", 16)} ONDERWERPEN\n`,
    );
    for (const b of selectie) {
      process.stdout.write(
        `${kolom(b.sleutel, 32)} ${kolom(b.soort, 11)} ${kolom(b.actief ? "ja" : "nee", 4)} ` +
          `${kolom(b.robotsStatus, 11)} ${kolom(b.tdmStatus, 16)} ${b.onderwerpen.join(",")}\n`,
      );
    }
    const aan = selectie.filter((b) => b.actief).length;
    process.stdout.write(`\n${selectie.length} bronnen, ${aan} actief, ${selectie.length - aan} uit\n`);
    process.stdout.write("\nUIT, met reden:\n");
    for (const b of selectie.filter((x) => !x.actief)) {
      process.stdout.write(`  ${b.sleutel}\n      ${b.inactiefReden}\n`);
    }
    return 0;
  }

  if (heeft("controleer")) {
    let fouten = 0;
    for (const b of selectie) {
      const f = controleerBron(b);
      fouten += f.length;
      for (const regel of f) process.stdout.write(`FOUT  ${regel}\n`);
    }
    process.stdout.write(
      fouten === 0
        ? `STRUCTUURCONTROLE = PASS (${selectie.length} bronnen)\n`
        : `STRUCTUURCONTROLE = FAIL (${fouten} fouten)\n`,
    );
    return fouten === 0 ? 0 : 1;
  }

  if (heeft("verifieer")) {
    const haalOok = heeft("haal");
    process.stdout.write(
      `VERIFICATIE${haalOok ? " MET OPHALEN" : " (alleen toestemming)"} — ${selectie.length} bronnen\n\n`,
    );
    let blokkerend = 0;
    let letOp = 0;

    for (const b of selectie) {
      const v = await verifieerBron(b, { haalOok });
      const vlag = v.afwijkingen.some((a) => a.ernst === "blokkerend")
        ? "BLOKKEREND"
        : v.afwijkingen.length > 0
          ? "LET OP"
          : "ok";
      blokkerend += v.afwijkingen.filter((a) => a.ernst === "blokkerend").length;
      letOp += v.afwijkingen.filter((a) => a.ernst === "let_op").length;

      process.stdout.write(
        `[${kolom(vlag, 10)}] ${kolom(v.sleutel, 32)} aan=${v.registerActief ? "ja " : "nee"} ` +
          `robots=${kolom(v.robotsGemeten, 11)} tdm=${kolom(v.tdmGemeten, 16)} ` +
          `grondslag=${kolom(v.toestemmingsGrondslag, 24)}` +
          (haalOok
            ? ` ophalen=${kolom(v.ophaalResultaat, 15)} http=${v.httpStatus ?? "-"} items=${v.aantalItems ?? "-"}`
            : "") +
          "\n",
      );
      for (const a of v.afwijkingen) {
        process.stdout.write(
          `              ${a.ernst === "blokkerend" ? "!!" : " ~"} ${a.veld}: register '${a.inRegister}' vs gemeten '${a.gemeten}'\n`,
        );
      }
      for (const f of v.structuurFouten) {
        process.stdout.write(`              !! structuur: ${f}\n`);
      }
      if (v.afwijkingen.length > 0 || haalOok) {
        process.stdout.write(`              ${v.opmerking.slice(0, 220)}\n`);
      }
    }

    process.stdout.write(`\nblokkerende afwijkingen: ${blokkerend}   let op: ${letOp}\n`);
    process.stdout.write(`VERIFICATIE = ${blokkerend === 0 ? "PASS" : "FAIL"}\n`);
    return blokkerend === 0 ? 0 : 1;
  }

  process.stderr.write("onbekende optie. Zie de kop van src/cli/bronnen.ts\n");
  return 2;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    process.stderr.write(`${(e as Error).stack ?? String(e)}\n`);
    process.exit(1);
  },
);
