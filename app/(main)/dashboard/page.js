'use client';

import { useState, useEffect, useCallback } from 'react';
import CategoryFilter from '@/components/category/CategoryFilter';
import CategoryManager from '@/components/category/CategoryManager';
import FetchNewsButton from '@/components/news/FetchNewsButton';
import NewsGrid from '@/components/news/NewsGrid';
import KeywordSearch from '@/components/news/KeywordSearch';

export default function DashboardPage() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesMap, setCategoriesMap] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [loadingNews, setLoadingNews] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalNewsCount, setTotalNewsCount] = useState(null);

  // 전체 뉴스 개수 조회
  const fetchTotalCount = useCallback(async () => {
    const res = await fetch('/api/news/count');
    if (!res.ok) return;
    const data = await res.json();
    setTotalNewsCount(data.total);
  }, []);

  // 카테고리 목록 조회
  const fetchCategories = useCallback(async () => {
    const res = await fetch('/api/categories');
    if (!res.ok) return;
    const data = await res.json();
    setCategories(data);
    // id → category 객체 맵 생성
    const map = {};
    data.forEach((c) => {
      map[c.id] = c;
    });
    setCategoriesMap(map);
  }, []);

  // 뉴스 목록 조회
  const fetchNews = useCallback(
    async (categoryId, currentPage, currentKeyword) => {
      setLoadingNews(true);
      try {
        const params = new URLSearchParams({ page: currentPage });
        if (categoryId) params.set('categoryId', categoryId);
        if (currentKeyword) params.set('keyword', currentKeyword);
        const res = await fetch(`/api/news?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        // articles 객체만 추출 (카테고리는 categoriesMap으로 별도 관리)
        setArticles(
          data.articles.map((row) => (row.articles ? row.articles : row))
        );
        setTotalPages(Math.max(1, Math.ceil(data.total / data.pageSize)));
      } finally {
        setLoadingNews(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchCategories();
    fetchTotalCount();
  }, [fetchCategories, fetchTotalCount]);

  useEffect(() => {
    fetchNews(activeCategory, page, keyword);
  }, [activeCategory, page, keyword, fetchNews]);

  function handleCategorySelect(id) {
    setActiveCategory(id);
    setPage(1);
  }

  function handleKeywordSearch(newKeyword) {
    setKeyword(newKeyword);
    setPage(1);
  }

  function handleCategoryAdded() {
    fetchCategories();
  }

  function handleNewsFetched() {
    setPage(1);
    fetchNews(activeCategory, 1);
    fetchTotalCount();
    // 뉴스 처리 중 새로 만들어진 카테고리를 필터 바에 반영
    fetchCategories();
  }

  // 삭제된 기사를 목록에서 제거
  function handleArticleDelete(deletedId) {
    setArticles((prev) => prev.filter((a) => a.id !== deletedId));
    setTotalNewsCount((prev) => (prev !== null ? prev - 1 : prev));
  }

  return (
    <div>
      {/* 헤더 영역: 제목 + 배지 + 뉴스 가져오기 버튼 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            AI 뉴스 대시보드
          </h1>
          {totalNewsCount !== null && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
              총 {totalNewsCount.toLocaleString()}개의 뉴스
            </span>
          )}
        </div>
        <FetchNewsButton onFetched={handleNewsFetched} />
      </div>

      {/* 카테고리 바 + 키워드 검색 */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onSelect={handleCategorySelect}
          onAddClick={() => setShowAddModal(true)}
        />
        <KeywordSearch onSearch={handleKeywordSearch} />
      </div>

      {/* 뉴스 그리드 */}
      <NewsGrid
        articles={articles}
        categoriesMap={categoriesMap}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onDelete={handleArticleDelete}
        loading={loadingNews}
      />

      {/* 카테고리 추가 모달 */}
      {showAddModal && (
        <CategoryManager
          onClose={() => setShowAddModal(false)}
          onAdded={handleCategoryAdded}
        />
      )}
    </div>
  );
}
