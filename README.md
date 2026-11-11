# Relieful României

Aplicație de învățat relieful României pentru examenul de geografie. Are hartă, lecții, fotografii, comparații și jocuri pe harta oarbă (România și Europa).

**Deschide aplicația:** https://gold-shift.github.io/relieful-romaniei/

## Ce conține
- **Hartă:** harta de relief a României cu unitățile și cele 37 de subunități.
- **Lecții:** fișa fiecărei unități (formare, roci, altitudine, tipuri de relief), făcută după caiet.
- **Tipuri de relief:** desene și fotografii reale.
- **Comparații:** asemănări și deosebiri între oricare două unități.
- **Jocuri pe hartă:** unități și subunități de relief, vârfuri, țările și capitalele Europei. Se joacă în 3 moduri: apeși pe hartă, alegi din variante sau scrii numele.
- **Exersare:** cartonașe cu repetare la intervale și teste.

Progresul se salvează doar în browserul fiecăruia.

## Pe telefon
Deschide linkul de mai sus în Chrome sau Safari.
- **Android (Chrome):** meniul ⋮ → „Adaugă pe ecranul de pornire”.
- **iPhone (Safari):** butonul Partajează → „Adaugă pe ecranul principal”.

Aplicația apare apoi ca o iconiță, ca orice altă aplicație.

## Surse
Hărțile și fotografiile sunt de pe Wikimedia Commons, cu licențe libere. Contururile țărilor și râurile sunt din Natural Earth (domeniu public), iar altitudinile din Mapzen Terrarium. Lista completă e în [imagini/SURSE.md](imagini/SURSE.md).

Granițele subunităților de relief sunt calculate din altitudini și râuri (`unelte/harta_romania.py`), deci sunt aproximative și nu o hartă oficială.

## Pentru cine modifică
- `data.js`: tot conținutul lecțiilor.
- `unelte/subunitati.json`: lista subunităților.
- `python unelte/harta_romania.py date-brute harta-romania.js`: reface harta.
- `python unelte/site.py`: reface `index.html` din `relieful-romaniei.html`.
