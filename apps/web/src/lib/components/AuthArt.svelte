<!-- Ilustrasi finansial untuk panel auth desktop: kartu pengeluaran,
     progress budget, dan donat kategori — palet brand Google. Murni SVG. -->
<script lang="ts">
	let { class: cls = '' }: { class?: string } = $props();
</script>

<svg viewBox="0 0 480 560" fill="none" class={cls} role="img" aria-label="Ilustrasi pengelolaan pengeluaran">
	<defs>
		<linearGradient id="cu-bg" x1="0" y1="0" x2="480" y2="560" gradientUnits="userSpaceOnUse">
			<stop stop-color="#FCE8E6" />
			<stop offset="0.55" stop-color="#FEF7E0" />
			<stop offset="1" stop-color="#E6F4EA" />
		</linearGradient>
		<linearGradient id="cu-card" x1="0" y1="0" x2="1" y2="1">
			<stop stop-color="#ffffff" />
			<stop offset="1" stop-color="#FFF7F6" />
		</linearGradient>
		<linearGradient id="cu-hero" x1="40" y1="120" x2="440" y2="120" gradientUnits="userSpaceOnUse">
			<stop stop-color="#D93025" />
			<stop offset="1" stop-color="#A50E0E" />
		</linearGradient>
	</defs>

	<rect x="8" y="8" width="464" height="544" rx="36" fill="url(#cu-bg)" />
	<circle cx="400" cy="90" r="70" fill="#FAD2CF" opacity="0.7" />
	<circle cx="70" cy="470" r="90" fill="#CEEAD6" opacity="0.6" />
	<circle cx="90" cy="110" r="26" fill="#FDE293" opacity="0.8" />

	<!-- Kartu total bulan -->
	<rect x="70" y="70" width="340" height="150" rx="24" fill="url(#cu-hero)" />
	<rect x="70" y="70" width="340" height="150" rx="24" fill="#000" opacity="0.04" />
	<text x="102" y="112" font-family="Nunito, sans-serif" font-size="15" fill="#FAD2CF">Total bulan ini</text>
	<text x="102" y="152" font-family="Nunito, sans-serif" font-size="34" font-weight="800" fill="#ffffff">Rp3.850.000</text>
	<rect x="102" y="172" width="276" height="10" rx="5" fill="#ffffff" opacity="0.3" />
	<rect x="102" y="172" width="200" height="10" rx="5" fill="#FBBC04" />
	<text x="102" y="202" font-family="Nunito, sans-serif" font-size="13" fill="#FAD2CF">77% dari budget Rp5.000.000</text>
	<circle cx="366" cy="112" r="26" fill="#ffffff" opacity="0.18" />
	<path d="M356 112h20M366 102v20" stroke="#fff" stroke-width="5" stroke-linecap="round" />

	<!-- Kartu transaksi -->
	<rect x="70" y="248" width="340" height="220" rx="24" fill="url(#cu-card)" stroke="#FAD2CF" stroke-width="1.5" />
	<text x="102" y="284" font-family="Nunito, sans-serif" font-size="15" font-weight="800" fill="#3F3F46">Terakhir dicatat</text>
	<circle cx="366" cy="278" r="14" fill="#E6F4EA" />
	<path d="M360 278l4 4 7-8" stroke="#1E8E3E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

	<g font-family="Nunito, sans-serif">
		<circle cx="112" cy="322" r="20" fill="#FEF7E0" />
		<path d="M104 322h16M112 314v16" stroke="#B06000" stroke-width="3" stroke-linecap="round" />
		<text x="144" y="318" font-size="15" font-weight="700" fill="#27272A">Kopi Kenangan</text>
		<text x="144" y="338" font-size="13" fill="#71717A">Makanan · Hari ini</text>
		<text x="378" y="330" font-size="15" font-weight="800" fill="#27272A" text-anchor="end">25rb</text>

		<circle cx="112" cy="378" r="20" fill="#E8F0FE" />
		<path d="M104 378h13l3-7 4 14 3-7h5" stroke="#1967D2" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
		<text x="144" y="374" font-size="15" font-weight="700" fill="#27272A">Ojek Online</text>
		<text x="144" y="394" font-size="13" fill="#71717A">Transport · Kemarin</text>
		<text x="378" y="386" font-size="15" font-weight="800" fill="#27272A" text-anchor="end">18rb</text>

		<circle cx="112" cy="434" r="20" fill="#FCE8E6" />
		<rect x="104" y="426" width="16" height="13" rx="2.5" stroke="#D93025" stroke-width="2.5" />
		<path d="M104 430l8 6 8-6" stroke="#D93025" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
		<text x="144" y="430" font-size="15" font-weight="700" fill="#27272A">Listrik PLN</text>
		<text x="144" y="450" font-size="13" fill="#71717A">Tagihan · 2 hari lalu</text>
		<text x="378" y="442" font-size="15" font-weight="800" fill="#27272A" text-anchor="end">350rb</text>
	</g>

	<!-- Badge insight melayang -->
	<rect x="252" y="492" width="170" height="52" rx="16" fill="#1E8E3E" />
	<circle cx="280" cy="518" r="13" fill="#ffffff" opacity="0.25" />
	<path d="M274 518l4 4 8-9" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
	<text x="300" y="514" font-family="Nunito, sans-serif" font-size="13" font-weight="800" fill="#fff">Hemat 9,5%</text>
	<text x="300" y="531" font-family="Nunito, sans-serif" font-size="12" fill="#CEEAD6">vs bulan lalu</text>

	<!-- Koin melayang -->
	<circle cx="52" cy="250" r="17" fill="#FBBC04" />
	<text x="52" y="257" text-anchor="middle" font-family="Nunito, sans-serif" font-size="17" font-weight="800" fill="#fff">Rp</text>
	<circle cx="432" cy="420" r="13" fill="#34A853" />
	<path d="M426 420l4 4 7-8" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>
