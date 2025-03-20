// components/CategoriesStateTester.tsx

import React, { useState } from "react";
import LeftSidebar from "./LeftSidebar";
import { Category, CategoryStatus } from "../utils/utils";

import { sampleCategory } from "../utils/sampleCategory";

const CategoriesStateTester: React.FC = () => {
  // Categories state
  const [categories, setCategories] = useState<Category[]>(sampleCategory);

  // Mock states from useCategories
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(false);
  const [isRetryingCategories, setIsRetryingCategories] = useState<boolean>(false);
  const [retryCountCategories, setRetryCountCategories] = useState<number>(0);
  const [hasErrorCategories, setHasErrorCategories] = useState<boolean>(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  // Other required states and mock functions
  const [loadingSearchTermId] = useState<number | null>(null);
  const [categoriesFetching, setCategoriesFetching] = useState<string | number | null>(null);
  const [categoriesStatus] = useState<CategoryStatus[]>(sampleCategory);
  const [, setActiveTab] = useState<string | null>(null);
  const [, setSelectedCategoryName] = useState<string | null>(null);
  const [, setSelectedCategoryId] = useState<string | number | null>(null);
  const [isFetchingAllNewsByButton, setIsFetchingAllNewsByButton] = useState<boolean>(false);

  const refFetchNews = React.createRef<HTMLSpanElement>();

  // Mock functions
  const toggleCategoryTable = (categoryId: string | number) => {
    setCategories(
      categories.map(category => ({
        ...category,
        showTable: category.id === categoryId ? !category.showTable : false,
      }))
    );
  };

  const deleteCategory = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingCategoryId(categoryId);

    // Simulate deletion process
    setTimeout(() => {
      setCategories(prevCategories => prevCategories.filter(category => category.id !== Number(categoryId)));
      setDeletingCategoryId(null);
    }, 1000);
  };

  const removeSearchTerm = (categoryId: string | number, termIndex: number) => {
    setCategories(prevCategories =>
      prevCategories.map(category => {
        if (category.id === categoryId && category.searchTerms) {
          return {
            ...category,
            searchTerms: category.searchTerms.filter((_, index) => index !== termIndex),
          };
        }
        return category;
      })
    );
  };

  const fetchNewsForCategory = async () => {
    // Mock implementation
    return Promise.resolve();
  };

  const fetchAllNews = () => {
    setIsFetchingAllNewsByButton(true);

    // Simulate fetching process
    setTimeout(() => {
      setIsFetchingAllNewsByButton(false);
    }, 4000);
  };

  const fetchCategories = async () => {
    // Mock implementation
    return Promise.resolve();
  };

  // Control panel for testing different states
  const renderControlPanel = () => (
    <div className="bg-gray-100 p-4 mb-4 rounded-lg">
      <h2 className="text-lg font-bold mb-2">Test Controls</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium mb-2">Loading States</h3>
          <div className="flex flex-col gap-2">
            <button
              className={`px-3 py-2 rounded ${isLoadingCategories ? "bg-blue-500 text-white" : "bg-gray-200"}`}
              onClick={() => setIsLoadingCategories(!isLoadingCategories)}
            >
              Toggle isLoadingCategories
            </button>

            <button
              className={`px-3 py-2 rounded ${isRetryingCategories ? "bg-blue-500 text-white" : "bg-gray-200"}`}
              onClick={() => setIsRetryingCategories(!isRetryingCategories)}
            >
              Toggle isRetryingCategories
            </button>

            <div className="flex items-center gap-2">
              <button
                className="px-3 py-2 rounded bg-gray-200"
                onClick={() => setRetryCountCategories(prev => Math.max(0, prev - 1))}
              >
                -
              </button>
              <span className="px-2">Retry Count: {retryCountCategories}</span>
              <button
                className="px-3 py-2 rounded bg-gray-200"
                onClick={() => setRetryCountCategories(prev => prev + 1)}
              >
                +
              </button>
            </div>

            <button
              className={`px-3 py-2 rounded ${hasErrorCategories ? "bg-red-500 text-white" : "bg-gray-200"}`}
              onClick={() => setHasErrorCategories(!hasErrorCategories)}
            >
              Toggle hasErrorCategories
            </button>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">Action Simulation</h3>
          <div className="flex flex-col gap-2">
            <button
              className="px-3 py-2 rounded bg-gray-200"
              onClick={() => {
                setIsLoadingCategories(true);
                setTimeout(() => setIsLoadingCategories(false), 2000);
              }}
            >
              Simulate Initial Load
            </button>

            <button
              className="px-3 py-2 rounded bg-gray-200"
              onClick={() => {
                setIsLoadingCategories(true);
                setIsRetryingCategories(true);
                setRetryCountCategories(1);
                setTimeout(() => {
                  setIsRetryingCategories(false);
                  setRetryCountCategories(0);
                  setIsLoadingCategories(false);
                }, 2000);
              }}
            >
              Simulate Single Retry
            </button>

            <button
              className="px-3 py-2 rounded bg-gray-200"
              onClick={() => {
                // Maximum retries exceed scenario
                setIsLoadingCategories(true);
                setIsRetryingCategories(true);

                let count = 1;
                const interval = setInterval(() => {
                  setRetryCountCategories(count);

                  if (count >= 3) {
                    clearInterval(interval);
                    setIsRetryingCategories(false);
                    setHasErrorCategories(true);
                    setIsLoadingCategories(false);
                  }

                  count++;
                }, 1000);
              }}
            >
              Simulate Max Retries
            </button>

            <button
              className="px-3 py-2 rounded bg-gray-200"
              onClick={() => {
                setHasErrorCategories(false);
                setRetryCountCategories(0);
              }}
            >
              Reset Error State
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen">
      {renderControlPanel()}

      <div className="flex flex-grow">
        <LeftSidebar
          categories={categories}
          setCategories={setCategories}
          isLoadingCategories={isLoadingCategories}
          isRetryingCategories={isRetryingCategories}
          retryCountCategories={retryCountCategories}
          hasErrorCategories={hasErrorCategories}
          deletingCategoryId={deletingCategoryId}
          toggleCategoryTable={toggleCategoryTable}
          deleteCategory={deleteCategory}
          loadingSearchTermId={loadingSearchTermId}
          removeSearchTerm={removeSearchTerm}
          categoriesFetching={categoriesFetching}
          setCategoriesFetching={setCategoriesFetching}
          categoriesStatus={categoriesStatus}
          refFetchNews={refFetchNews}
          fetchNewsForCategory={fetchNewsForCategory}
          fetchAllNews={fetchAllNews}
          isFetchingAllNewsByButton={isFetchingAllNewsByButton}
          setActiveTab={setActiveTab}
          setSelectedCategoryName={setSelectedCategoryName}
          fetchCategories={fetchCategories}
          setSelectedCategoryId={setSelectedCategoryId}
        />

        <div className="flex-grow bg-gray-50 p-4">
          <h2 className="text-xl font-bold mb-4">Current States:</h2>
          <div className="bg-white shadow rounded p-4">
            <ul className="space-y-2">
              <li>
                <strong>isLoadingCategories:</strong> {isLoadingCategories ? "true" : "false"}
              </li>
              <li>
                <strong>isRetryingCategories:</strong> {isRetryingCategories ? "true" : "false"}
              </li>
              <li>
                <strong>retryCountCategories:</strong> {retryCountCategories}
              </li>
              <li>
                <strong>hasErrorCategories:</strong> {hasErrorCategories ? "true" : "false"}
              </li>
              <li>
                <strong>deletingCategoryId:</strong> {deletingCategoryId || "null"}
              </li>
              <li>
                <strong>Categories Count:</strong> {categories.length}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoriesStateTester;
