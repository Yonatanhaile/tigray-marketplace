import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listingsAPI } from '../services/api';
import { CATEGORIES } from '../constants/categories';
import ETHIOPIAN_LOCATIONS from '../constants/locations';
import { formatPrice } from '../utils/format';
import { getCategoryIcon, getSubcategoryIcon } from '../constants/categoryIcons';
import { onNewActiveListing, offNewActiveListing } from '../services/socket';
import BackButton from '../components/BackButton';

const Search = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [subcategory, setSubcategory] = useState(searchParams.get('subcategory') || '');
  const [region, setRegion] = useState(searchParams.get('region') || '');
  const [zone, setZone] = useState(searchParams.get('zone') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [showFilters, setShowFilters] = useState(false);

  const page = parseInt(searchParams.get('page')) || 1;

  const { data, isLoading } = useQuery({
    queryKey: ['listings', 'search', query, minPrice, maxPrice, category, subcategory, region, zone, sort, page],
    queryFn: () =>
      listingsAPI.getAll({
        query,
        minPrice,
        maxPrice,
        category,
        subcategory,
        region,
        zone,
        sort,
        page,
        limit: 12,
      }),
  });

  // Real-time updates for new active listings
  useEffect(() => {
    const handleNewActiveListing = (data) => {
      console.log('✨ New active listing in search:', data);
      // Invalidate all search queries to refresh the data
      queryClient.invalidateQueries(['listings', 'search']);
      queryClient.invalidateQueries(['listings']);
    };

    onNewActiveListing(handleNewActiveListing);

    return () => {
      offNewActiveListing(handleNewActiveListing);
    };
  }, [queryClient]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = {};
    if (query) params.q = query;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (category) params.category = category;
    if (subcategory) params.subcategory = subcategory;
    if (region) params.region = region;
    if (zone) params.zone = zone;
    if (sort) params.sort = sort;
    params.page = '1';
    setSearchParams(params);
    // Close filters on mobile after searching
    setShowFilters(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="mb-3 sm:mb-4">
        <BackButton />
      </div>
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{t('search.browseTitle')}</h1>
        
        {/* Mobile Filter Toggle Button */}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:bg-purple-700 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {/* Search & Filters */}
      <form onSubmit={handleSearch} className={`card mb-6 sm:mb-8 ${showFilters ? 'block' : 'hidden md:block'}`}>
        {/* Row 1: Search, Category, Subcategory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="sm:col-span-2 md:col-span-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search.searchPlaceholder')}
              className="input text-sm sm:text-base"
            />
          </div>
          <div>
            <select value={category} onChange={(e) => { setCategory(e.target.value); setSubcategory(''); }} className="input text-sm sm:text-base">
              <option value="">{t('search.allCategories')}</option>
              {Object.keys(CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{getCategoryIcon(cat)} {cat}</option>
              ))}
            </select>
          </div>
          <div>
            <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="input text-sm sm:text-base" disabled={!category}>
              <option value="">{t('search.allSubcategories')}</option>
              {(CATEGORIES[category] || []).map((sub) => (
                <option key={sub} value={sub}>{getSubcategoryIcon(sub)} {sub}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Location, Price, Sort */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          <div>
            <select value={region} onChange={(e) => { setRegion(e.target.value); setZone(''); }} className="input text-sm sm:text-base">
              <option value="">{t('search.allRegions')}</option>
              {Object.keys(ETHIOPIAN_LOCATIONS).map(reg => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
          </div>
          <div>
            <select value={zone} onChange={(e) => setZone(e.target.value)} className="input text-sm sm:text-base" disabled={!region}>
              <option value="">{t('search.allZones')}</option>
              {(ETHIOPIAN_LOCATIONS[region] || []).map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
          <div>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder={t('search.minPrice')}
              className="input text-sm sm:text-base"
            />
          </div>
          <div>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder={t('search.maxPrice')}
              className="input text-sm sm:text-base"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="input text-sm sm:text-base">
              <option value="newest">{t('search.newest')}</option>
              <option value="price_asc">{t('search.priceLowToHigh')}</option>
              <option value="price_desc">{t('search.priceHighToLow')}</option>
            </select>
          </div>
        </div>

        <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <button type="submit" className="btn btn-primary text-sm sm:text-base py-2 sm:py-2">
            🔍 {t('common.search')}
          </button>
          {(query || category || subcategory || region || zone || minPrice || maxPrice) && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory('');
                setSubcategory('');
                setRegion('');
                setZone('');
                setMinPrice('');
                setMaxPrice('');
                setSearchParams({});
                setShowFilters(false); // Close filters on mobile
              }}
              className="btn btn-secondary text-sm sm:text-base py-2 sm:py-2"
            >
              {t('search.clearFilters')}
            </button>
          )}
        </div>
      </form>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="card">
              <div className="w-full h-48 skeleton mb-4" />
              <div className="h-4 skeleton w-3/4 mb-2" />
              <div className="h-3 skeleton w-full mb-2" />
              <div className="h-3 skeleton w-2/3" />
            </div>
          ))}
        </div>
      ) : data?.listings?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">{t('search.noResults')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {data?.listings?.map((listing) => (
              <Link
                key={listing._id}
                to={`/listings/${listing._id}`}
                className="card hover:shadow-lg transition group"
              >
                {listing.images?.[0] && (
                  <img
                    src={listing.images[0].url}
                    alt={listing.title}
                    className="w-full h-32 sm:h-48 object-contain bg-gray-50 rounded-lg mb-2 sm:mb-4 group-hover:scale-105 transition-transform"
                  />
                )}
                <h3 className="font-semibold text-sm sm:text-lg mb-1 sm:mb-2 line-clamp-1">{listing.title}</h3>
                <p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-2">
                  {listing.description}
                </p>
                <div className="mb-2">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded capitalize inline-block">
                    {listing.condition}
                  </span>
                </div>
                {listing.location && (
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-1 line-clamp-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {listing.location.region}{listing.location.zone ? `, ${listing.location.zone}` : ''}
                  </p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-base sm:text-xl font-bold text-purple-600">{formatPrice(listing.price, listing.currency)}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {data?.pagination && data.pagination.pages > 1 && (
            <div className="flex justify-center space-x-2 mt-8">
              {Array.from({ length: data.pagination.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    const params = Object.fromEntries(searchParams);
                    params.page = p.toString();
                    setSearchParams(params);
                  }}
                  className={`px-4 py-2 rounded ${
                    p === page
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Search;

