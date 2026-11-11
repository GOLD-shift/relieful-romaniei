# Imagini folosite în aplicația „Relieful României”

Toate fișierele sunt luate de pe Wikimedia Commons (https://commons.wikimedia.org/wiki/File:<nume>) și au licență liberă. Licențele CC BY și CC BY-SA cer să fie trecut autorul. Aplicația face asta în pagina „Surse imagini”.

Descărcate pe 11.11.2026. Fotografiile au fost micșorate la 1200 px lățime.

## imagini/harti
| Fișier | Original pe Commons | Autor | Licență | Folosit la |
|---|---|---|---|---|
| romania-relief.png | Relief Map of Romania.png | Nzeemin | CC BY-SA 3.0 | hartă și jocuri pe hartă. Colțurile sunt lon 20–30 °E și lat 43,4–48,5 °N |
| europa-relief.jpg | Europe relief laea location map.jpg | Alexrk2 | CC BY-SA 3.0 | harta Europei (proiecție Lambert, fără coordonate simple) |

## imagini/relief
| Fișier | Original pe Commons | Autor | Licență | Unitate / tip de relief |
|---|---|---|---|---|
| sfinxul-bucegi.jpg | Bucegi Sphinx - Romania - July 2009.jpg | Radu Privantu | CC BY 2.0 | Bucegi, relief ruiniform |
| babele-bucegi.jpg | Bucegi - Babele (9372151742).jpg | Stefan Jurca | CC BY-SA 2.0 | Bucegi, relief ruiniform |
| lacul-bucura.jpg | Lacul Bucura, Lacul Ana a Lacul Bucurelu.jpg | Dezidor | CC BY 3.0 | Retezat, relief glaciar |
| calimani.jpg | Vârful Pietrosu Călimani (2100 m).jpg | MiHai350T | CC BY-SA 4.0 | Orientali (grupa centrală), relief vulcanic |
| lacul-sfanta-ana.jpg | Szent Anna tó 2.jpg | Csanády | domeniu public | Orientali, lac de crater (nu e în caiet) |
| ciucas.jpg | Ciucaș Mountains 18.jpg | kallerna | CC BY-SA 4.0 | Orientali (grupa sudică), Vf. Ciucaș |
| cheile-turzii.jpg | Cheile Turzii (Turda Gorges).jpg | Cristian Bortes | CC BY 2.0 | Apuseni, relief carstic |
| pestera-ursilor.jpg | Medvebarlang10.jpg | Zátonyi Sándor (ifj.) | CC BY 3.0 | Apuseni, relief carstic |
| salina-turda.jpg | Salina Turda, Romania.jpg | 7oanna | CC BY-SA 4.0 | Depresiunea Transilvaniei, sare |
| muntii-macinului.jpg | Măcin Mountains seen from Smârdan (DN22J).jpg | SqueekRO | CC BY 4.0 | Dobrogea de Nord |
| coasta-mangalia.jpg | Mangalia Küste.JPG | Julian Nyča | CC BY-SA 4.0 | Dobrogea de Sud, faleză |
| delta-satelit.jpg | Danube Delta ESA23450088.jpeg | European Space Agency | atribuire ESA | Delta Dunării |

## Cum adaugi o imagine nouă
1. Pune fișierul în `imagini/relief` sau `imagini/harti`.
2. Adaugă o intrare în lista `poze` din `data.js`, cu fișierul, titlul, unitatea, tipul de relief, autorul și licența.
3. Trece-o și în tabelul de mai sus.

## Date pentru hărțile oarbe (folderul date-brute, nepublicat)
| Fișier | Sursă | Licență | Folosit la |
|---|---|---|---|
| ne_10m_admin_0_countries.geojson, ne_50m_admin_0_countries.geojson | Natural Earth (naturalearthdata.com), prin github.com/nvkelso/natural-earth-vector | domeniu public | granița României, vecinii și țările Europei |
| dem-z7/*.png | dale de altitudine Terrarium (Mapzen / AWS Open Data: elevation-tiles-prod) | date libere, cu atribuire Mapzen | granițele unităților de relief, mutate după altitudine |
| seminte.json | exportat din data.js | – | contururile aproximative de la care pornește calculul |

Programele care fac hărțile sunt în folderul `unelte`:
- `harta_romania.py date-brute harta-romania.js`: unitățile de relief;
- `harta_europa.py date-brute/ne_50m_admin_0_countries.geojson harta-europa.js`: țările Europei;
- `previzualizare.py`: desenează contururile peste harta de relief, ca să le verifici.
