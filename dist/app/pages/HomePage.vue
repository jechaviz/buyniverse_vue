<template>
  <div class="space-y-16 lg:space-y-24">
    <!-- 1. Hero Section with Search & Live Auction Widget -->
    <HomeHeroSection :store="store" />

    <!-- 2-6. Marketplace Intelligence, Categories, SRM Agents & Opportunities -->
    <HomeIntelligenceSection
      :store="store"
      :categories="categories"
      :trending-services="trendingServices"
      :featured-jobs="featuredJobs"
      :popular-skills="popularSkills"
      :top-freelancers="topFreelancers"
    />

    <!-- 7-10. Success Model Gain-Share, ROI Simulator, App Download & CTA -->
    <HomeGainShareSection :store="store" />
  </div>
</template>

<script>
const { inject, ref, computed, defineAsyncComponent } = Vue;
const { useRoute, useRouter } = VueRouter;
const load = (p) => defineAsyncComponent(() => window["vue3-sfc-loader"].loadModule(p, window.sfcOptions));

const HomeHeroSection = load("./app/pages/home/HomeHeroSection.vue?v=1");
const HomeIntelligenceSection = load("./app/pages/home/HomeIntelligenceSection.vue?v=1");
const HomeGainShareSection = load("./app/pages/home/HomeGainShareSection.vue?v=1");

export default {
  components: {
    HomeHeroSection,
    HomeIntelligenceSection,
    HomeGainShareSection,
  },
  setup() {
    const store = inject("store");
    const route = useRoute();
    const router = useRouter();

    const tab = computed(() => (route.query.view === "saved" ? "saved" : "search"));
    const openTab = (key) =>
      router.push({
        path: "/",
        query: window.WebCommon ? window.WebCommon.mergeRouteQuery(route.query, { view: key === "saved" ? "saved" : null }) : { view: key === "saved" ? "saved" : undefined },
      });

    const categories = computed(() => [
      {
        title: store.t("Desarrollo de Software"),
        subtitle: "Full Stack, Apps Móviles, Cloud & APIs",
        count: "24 Proyectos",
        icon: "fa-solid fa-code",
        iconBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20",
        to: "/browse-services",
      },
      {
        title: store.t("Diseño UX/UI & 3D"),
        subtitle: "Figma, Design Systems, Animación",
        count: "18 Proyectos",
        icon: "fa-solid fa-palette",
        iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-500/20",
        to: "/browse-services",
      },
      {
        title: store.t("Sourcing & Compras B2B"),
        subtitle: "Licitaciones RFX, Subastas BAFO",
        count: "32 Rondas",
        icon: "fa-solid fa-gavel",
        iconBg: "bg-brand-50 text-brand dark:bg-brand/20",
        to: "/procurement/auction",
      },
      {
        title: store.t("Marketing & BAFO"),
        subtitle: "Growth, SEO, Campañas Globales",
        count: "15 Proyectos",
        icon: "fa-solid fa-bullhorn",
        iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20",
        to: "/browse-services",
      },
    ]);

    const trendingServices = computed(() => [
      {
        id: "srv-1",
        title: "Desarrollo Completo de App iOS y Android en Flutter",
        category: "Mobile Dev",
        price: 850.0,
        rating: "5.0 (42)",
        icon: "fa-solid fa-mobile-screen-button",
        to: "/browse-services",
      },
      {
        id: "srv-2",
        title: "Diseño de Marca Completa y Manual de Identidad",
        category: "Branding",
        price: 350.0,
        rating: "4.9 (88)",
        icon: "fa-solid fa-pen-nib",
        to: "/browse-services",
      },
      {
        id: "srv-3",
        title: "Auditoría de Compras y Sourcing RFX con 3-Way Match",
        category: "Procurement",
        price: 1200.0,
        rating: "5.0 (19)",
        icon: "fa-solid fa-chart-pie",
        to: "/browse-services",
      },
      {
        id: "srv-4",
        title: "Implementación de Arquitectura Cloud AWS & Docker",
        category: "DevOps",
        price: 950.0,
        rating: "4.8 (31)",
        icon: "fa-solid fa-server",
        to: "/browse-services",
      },
    ]);

    const popularSkills = [
      "Vue 3",
      "React",
      "Node.js",
      "Python",
      "Figma",
      "Sourcing B2B",
      "Docker",
      "Flutter",
      "Contratos Escrow",
      "Subastas BAFO",
    ];

    const topFreelancers = ref([
      {
        id: "user-freelancer-1",
        name: "John Doe",
        title: "Senior Full Stack & Cloud Architect",
        location: "San Francisco, USA",
        hourlyRate: 65.0,
      },
      {
        id: "user-freelancer-2",
        name: "Jane Smith",
        title: "Directora de Diseño & UX Specialist",
        location: "Madrid, España",
        hourlyRate: 50.0,
      },
      {
        id: "user-supplier-1",
        name: "Carlos Mendoza",
        title: "Especialista en Compras & Licitaciones",
        location: "CDMX, México",
        hourlyRate: 45.0,
      },
      {
        id: "user-freelancer-3",
        name: "Sarah Connor",
        title: "DevOps & Security Engineer",
        location: "Austin, USA",
        hourlyRate: 75.0,
      },
    ]);

    const featuredJobs = computed(() => {
      return (store.state.jobs || []).slice(0, 5);
    });

    return {
      store,
      tab,
      openTab,
      categories,
      trendingServices,
      featuredJobs,
      popularSkills,
      topFreelancers,
    };
  },
};
</script>
