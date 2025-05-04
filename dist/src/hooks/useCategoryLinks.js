import { useState, useEffect } from "react";
export const useCategoryLinks = (categories, setCategories) => {
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [selectedCategoryName, setSelectedCategoryName] = useState(null);
    const [activeTab, setActiveTab] = useState(null);
    // Process links to articles when selected category changes
    useEffect(() => {
        const addLinkToArticles = () => {
            const category = categories.find(cat => cat.id === selectedCategoryId);
            if (category && category.links.length > 0) {
                const newArticles = category.links.map((link, index) => ({
                    id: (index + 1).toString(),
                    title: "",
                    summary: "",
                    link: link.url,
                    selected: false,
                }));
                setCategories(categories.map(cat => (cat.id === selectedCategoryId ? { ...cat, articles: newArticles } : cat)));
            }
        };
        addLinkToArticles();
    }, [selectedCategoryId, categories, setCategories]);
    return {
        selectedCategoryId,
        setSelectedCategoryId,
        selectedCategoryName,
        setSelectedCategoryName,
        activeTab,
        setActiveTab,
    };
};
