import Banner from "../models/Banner.js";

const DEFAULT_BANNERS = [
    {
        title: "50% Off",
        subtitle: "On everything today",
        buttonText: "Get Now",
        image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1000&auto=format&fit=crop",
        link: "/shop",
        sortOrder: 1,
    },
    {
        title: "New Arrivals",
        subtitle: "Summer Collection 2024",
        buttonText: "Get Now",
        image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=1000&auto=format&fit=crop",
        link: "/shop",
        sortOrder: 2,
    },
    {
        title: "Big Sale",
        subtitle: "Up to 70% off shoes",
        buttonText: "Get Now",
        image: "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1000&auto=format&fit=crop",
        link: "/shop",
        sortOrder: 3,
    },
];

export const seedBanners = async () => {
    try {
        const count = await Banner.countDocuments();
        if (count > 0) return;
        await Banner.insertMany(DEFAULT_BANNERS);
        console.log("Default banners seeded");
    } catch (error: any) {
        console.error("Banner seed failed:", error.message);
    }
};

export default seedBanners;
