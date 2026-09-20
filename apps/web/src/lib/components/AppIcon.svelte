<script lang="ts" module>
	import {
		Award,
		BellRing,
		CalendarDays,
		ChartColumn,
		CircleAlert,
		CircleCheck,
		CirclePlus,
		ClipboardList,
		Coffee,
		Download,
		FlaskConical,
		Gamepad2,
		GraduationCap,
		HeartPulse,
		History,
		House,
		Inbox,
		LayoutDashboard,
		Lightbulb,
		LogOut,
		Menu,
		MonitorSmartphone,
		Moon,
		Motorbike,
		PanelLeftClose,
		PanelLeftOpen,
		Plus,
		ReceiptText,
		RotateCcw,
		Settings,
		Shapes,
		ShoppingBag,
		Sun,
		TrendingUp,
		TriangleAlert,
		UserRound,
		UtensilsCrossed,
		Wallet
	} from 'lucide-svelte';
	import type { Component } from 'svelte';

	// Hanya ikon yang dipakai yang di-bundle (tree-shakeable).
	// Tambahkan entri baru di sini saat memakai nama ikon baru.
	type IconProps = { size?: number | string; strokeWidth?: number | string; class?: string };
	// Satu cast di sini (tipe legacy lucide) — pemakaian <Cmp> di bawah tetap tercek.
	const MAP = {
		award: Award,
		'bell-ring': BellRing,
		'calendar-days': CalendarDays,
		'chart-column': ChartColumn,
		'circle-alert': CircleAlert,
		'circle-check': CircleCheck,
		'circle-plus': CirclePlus,
		'clipboard-list': ClipboardList,
		coffee: Coffee,
		download: Download,
		'flask-conical': FlaskConical,
		'gamepad-2': Gamepad2,
		'graduation-cap': GraduationCap,
		'heart-pulse': HeartPulse,
		history: History,
		house: House,
		inbox: Inbox,
		'layout-dashboard': LayoutDashboard,
		lightbulb: Lightbulb,
		'log-out': LogOut,
		menu: Menu,
		'monitor-smartphone': MonitorSmartphone,
		moon: Moon,
		motorbike: Motorbike,
		'panel-left-close': PanelLeftClose,
		'panel-left-open': PanelLeftOpen,
		plus: Plus,
		'receipt-text': ReceiptText,
		'rotate-ccw': RotateCcw,
		settings: Settings,
		shapes: Shapes,
		'shopping-bag': ShoppingBag,
		sun: Sun,
		'trending-up': TrendingUp,
		'triangle-alert': TriangleAlert,
		'user-round': UserRound,
		'utensils-crossed': UtensilsCrossed,
		wallet: Wallet
	};
</script>

<script lang="ts">
	// Render ikon Lucide by kebab-case name, e.g. <AppIcon name="wallet" size={20} />
	let {
		name,
		size = 18,
		strokeWidth = 2,
		class: cls = ''
	}: { name: string; size?: number | string; strokeWidth?: number | string; class?: string } = $props();

	const Cmp = $derived(MAP[name] ?? MAP['shapes']);
</script>

<Cmp {size} {strokeWidth} class={cls} />
