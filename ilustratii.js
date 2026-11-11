/* Ilustrații schematice (secțiuni prin teren) pentru fiecare tip de relief.
   Culorile vin din clasele CSS .rk .rk2 .gr .sd .cl .ls .wt .sn .lv .gs .sa .bg,
   ca să meargă în tema deschisă și în cea închisă. */
window.ILL = {
glaciar: `<svg viewBox="0 0 240 150"><path class="rk" d="M0 150V95L38 40L62 62L88 22L112 58Q122 90 145 90Q168 90 176 55L204 28L240 70V150Z"/>
<path class="sn" d="M88 22L78 38L90 35L97 44L104 38L112 58ZM204 28L194 42L206 40L214 48L222 46ZM38 40L30 52L42 50L48 56Z"/>
<ellipse class="wt" cx="145" cy="90" rx="18" ry="4"/>
<g class="rk2"><circle cx="122" cy="120" r="4"/><circle cx="133" cy="124" r="3.5"/><circle cx="145" cy="121" r="4.5"/><circle cx="157" cy="125" r="3.5"/><circle cx="168" cy="120" r="4"/></g>
<text x="120" y="70">circ + lac</text><text x="124" y="144">morene</text></svg>`,

vulcanic: `<svg viewBox="0 0 240 150"><path class="gr" d="M0 150V128H240V150Z"/>
<path class="rk" d="M20 130L100 42H140L220 130Z"/><path class="bg" d="M102 42Q120 62 138 42Z"/>
<path class="lv" d="M116 134V56H124V134Z"/><ellipse class="lv" cx="120" cy="140" rx="34" ry="8"/>
<text x="144" y="38">crater</text><text x="176" y="100">con</text><text x="128" y="104">coș</text><text x="160" y="146">magmă</text></svg>`,

carstic: `<svg viewBox="0 0 240 150"><rect class="rk" x="0" y="40" width="240" height="110"/>
<path class="ln" d="M0 64H240M0 88H240M0 112H240M0 136H240"/><rect class="gr" x="0" y="36" width="240" height="6"/>
<path class="bg" d="M40 34L52 120H68L80 34Z"/><rect class="wt" x="52" y="113" width="16" height="7"/>
<path class="bg" d="M120 100Q130 78 170 80Q205 82 210 104Q190 112 165 110Q140 112 120 100Z"/>
<path class="rk" d="M140 82L143 93L146 82ZM160 80L162 95L165 80ZM185 82L187 91L190 83Z"/>
<text x="46" y="26">chei</text><text x="146" y="130">peșteră</text><text x="186" y="58">calcar</text></svg>`,

ruiniform: `<svg viewBox="0 0 240 150"><rect class="gr" x="0" y="116" width="240" height="34"/>
<path class="rk" d="M40 118C44 100 36 92 30 86C26 76 40 66 56 70C72 66 82 78 74 88C68 94 60 102 64 118Z"/>
<path class="rk" d="M128 118V80C128 62 146 50 160 54C172 56 176 66 172 74C170 80 176 84 176 92V118Z"/>
<path class="rk2" d="M150 66h6v3h-6z"/>
<path class="rk2" d="M190 118C192 104 186 96 192 90C200 82 214 86 214 98C214 106 208 110 210 118Z"/>
<text x="26" y="58">Babele</text><text x="128" y="44">Sfinxul</text><text x="64" y="140">conglomerate</text></svg>`,

alunecari: `<svg viewBox="0 0 240 150"><path class="gr" d="M0 150V42H70L210 118H240V150Z"/>
<path class="cl" d="M0 150V100H90L240 140V150Z"/>
<path class="sd" d="M86 52Q132 68 150 92Q166 104 192 113Q176 121 150 119Q120 109 100 87Q90 72 86 52Z"/>
<path class="ln dash" d="M84 50Q96 100 162 118"/>
<path class="ln" d="M20 8l-6 14M40 6l-6 14M60 10l-6 14M30 24l-4 10M52 26l-4 10"/>
<text x="128" y="64">alunecare</text><text x="12" y="134">argilă</text><text x="76" y="20">ploi bogate</text></svg>`,

sare: `<svg viewBox="0 0 240 150"><rect class="sd" x="0" y="40" width="240" height="110"/>
<path class="ln" d="M0 72Q120 32 240 72M0 102Q120 72 240 102M0 130Q120 112 240 130"/>
<path class="sa" d="M90 150Q96 90 104 60Q120 36 136 60Q144 90 150 150Z"/>
<rect class="gr" x="0" y="36" width="96" height="5"/><rect class="gr" x="144" y="36" width="96" height="5"/>
<ellipse class="wt" cx="120" cy="40" rx="22" ry="4"/>
<text x="108" y="112">sare</text><text x="150" y="28">lac sărat</text><text x="10" y="28">Praid, Turda</text></svg>`,

domuri: `<svg viewBox="0 0 240 150"><path class="rk" d="M0 150V110Q120 40 240 110V150Z"/>
<path class="gr" d="M0 110Q120 40 240 110L240 104Q120 34 0 104Z"/>
<path class="cl" d="M0 150V126Q120 62 240 126V150Z"/>
<path class="rk2" d="M0 150V140Q120 86 240 140V150Z"/>
<ellipse class="gs" cx="120" cy="104" rx="34" ry="6"/>
<text x="104" y="60">dom</text><text x="90" y="126">gaz metan</text></svg>`,

crovuri: `<svg viewBox="0 0 240 150"><path class="ls" d="M0 150V70H40Q55 86 70 70H130Q148 88 166 70H240V150Z"/>
<path class="wt" d="M46 74Q55 81 64 74Z"/><path class="wt" d="M137 75Q148 83 159 75Z"/>
<path class="rk" d="M0 150V126H240V150Z"/>
<text x="40" y="60">crov</text><text x="134" y="60">crov</text><text x="96" y="110">loess</text><text x="96" y="142">calcar</text></svg>`,

litoral: `<svg viewBox="0 0 240 150"><rect class="wt" x="0" y="100" width="240" height="50"/>
<path class="ls" d="M0 150V44H106L112 62L108 82L118 150Z"/>
<path class="gr" d="M0 44H106V40H0Z"/>
<path class="sd" d="M150 150L162 104Q200 94 240 92V150Z"/>
<path class="ln" d="M126 112q8-5 16 0t16 0M10 124q8-5 16 0t16 0t16 0M60 140q8-5 16 0t16 0"/>
<text x="40" y="32">faleză</text><text x="186" y="84">plajă</text><text x="10" y="116">Marea Neagră</text></svg>`,

cutare: `<svg viewBox="0 0 240 150"><path class="rk" d="M30 60Q75 10 120 60T210 60V80Q165 130 120 80T30 80Z"/>
<path class="cl" d="M30 80Q75 30 120 80T210 80V100Q165 150 120 100T30 100Z"/>
<path class="sd" d="M30 100Q75 50 120 100T210 100V120Q165 170 120 120T30 120Z"/>
<path class="ln" d="M2 92H24M24 92l-7-5M24 92l-7 5M238 92H216M216 92l7-5M216 92l7 5"/>
<text x="44" y="26">anticlinal</text><text x="146" y="64">sinclinal</text><text x="2" y="146">împingere din lateral</text></svg>`,

piemont: `<svg viewBox="0 0 240 150"><path class="rk" d="M0 150V30L28 18L58 44L72 150Z"/>
<path class="sd" d="M50 62L240 118V150H50Z"/>
<path class="ln" d="M60 86L240 132M60 106L240 142"/>
<path class="ln" d="M76 48L158 74M158 74l-9-1M158 74l-5 7"/>
<text x="6" y="12">munte</text><text x="86" y="40">râurile aduc sedimente</text><text x="56" y="56">N</text><text x="226" y="110">S</text><text x="130" y="128">piemont</text></svg>`,

sedimentare: `<svg viewBox="0 0 240 150"><path class="rk" d="M0 150V40L30 30L52 60L60 150Z"/><path class="rk" d="M240 150V46L214 36L190 66L182 150Z"/>
<path class="sd" d="M56 150V128H186V150Z"/><path class="cl" d="M57 128V112H185V128Z"/><path class="ls" d="M58 112V98H184V112Z"/><path class="sd" d="M59 98V88H183V88Z"/>
<path class="wt" d="M58 88H184V80H58Z"/>
<path class="ln" d="M34 46Q50 62 70 76M70 76l-8-1M70 76l-4 7"/>
<text x="70" y="70">râul aduce materiale</text><text x="96" y="122">straturi</text><text x="4" y="18">zonă înaltă</text><text x="88" y="146">zonă joasă</text></svg>`,

flis: `<svg viewBox="0 0 240 150"><g transform="skewX(-18) translate(30 0)">
<rect class="rk" x="10" y="20" width="22" height="120"/><rect class="sd" x="32" y="20" width="16" height="120"/>
<rect class="cl" x="48" y="20" width="22" height="120"/><rect class="rk" x="70" y="20" width="18" height="120"/>
<rect class="sd" x="88" y="20" width="22" height="120"/><rect class="cl" x="110" y="20" width="16" height="120"/>
<rect class="rk" x="126" y="20" width="22" height="120"/><rect class="sd" x="148" y="20" width="18" height="120"/>
<rect class="cl" x="166" y="20" width="22" height="120"/></g>
<text x="58" y="14">fâșii paralele</text></svg>`
};
