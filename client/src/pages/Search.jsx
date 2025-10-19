import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { listingsAPI } from '../services/api';
import { CATEGORIES } from '../constants/categories';
import ETHIOPIAN_LOCATIONS from '../constants/locations';
import { formatPrice } from '../utils/format';
import { getCategoryIcon, getSubcategoryIcon } from '../constants/categoryIcons';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [subcategory, setSubcategory] = useState(searchParams.get('subcategory') || '');
  const [region, setRegion] = useState(searchParams.get('region') || '');
  const [zone, setZone] = useState(searchParams.get('zone') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');

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
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-6">Browse Listings</h1>

      {/* Search & Filters */}
      <form onSubmit={handleSearch} className="card mb-8">
        {/* Row 1: Search, Category, Subcategory */}
        <div className="grid md:grid-cols-4 gap-4 mb-4">
          <div className="md:col-span-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search listings..."
              className="input"
            />
          </div>
          <div>
            <select value={category} onChange={(e) => { setCategory(e.target.value); setSubcategory(''); }} className="input">
              <option value="">All Categories</option>
              {Object.keys(CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{getCategoryIcon(cat)} {cat}</option>
              ))}
            </select>
          </div>
          <div>
            <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="input" disabled={!category}>
              <option value="">All Subcategories</option>
              {(CATEGORIES[category] || []).map((sub) => (
                <option key={sub} value={sub}>{getSubcategoryIcon(sub)} {sub}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Location, Price, Sort */}
        <div className="grid md:grid-cols-5 gap-4">
          <div>
            <select value={region} onChange={(e) => { setRegion(e.target.value); setZone(''); }} className="input">
              <option value="">All Regions</option>
              {Object.keys(ETHIOPIAN_LOCATIONS).map(reg => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
          </div>
          <div>
            <select value={zone} onChange={(e) => setZone(e.target.value)} className="input" disabled={!region}>
              <option value="">All Zones</option>
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
              placeholder="Min Price"
              className="input"
            />
          </div>
          <div>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max Price"
              className="input"
            />
          </div>
          <div>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="input">
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center space-x-3">
          <button type="submit" className="btn btn-primary">
            🔍 Search
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
              }}
              className="btn btn-secondary"
            >
              Clear Filters
            </button>
          )}
        </div>
      </form>

      {/* Results */}
      {isLoading ? (
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
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
          <p className="text-gray-500">No listings found.</p>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
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
                    className="w-full h-48 object-contain bg-gray-50 rounded-lg mb-4 group-hover:scale-105 transition-transform"
                  />
                )}
                {listing.category && (
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-sm bg-purple-50 text-purple-700 px-2 py-1 rounded-lg font-medium">
                      {getCategoryIcon(listing.category)} {listing.category}
                    </span>
                    {listing.subcategory && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {getSubcategoryIcon(listing.subcategory)} {listing.subcategory}
                      </span>
                    )}
                  </div>
                )}
                <h3 className="font-semibold text-lg mb-2 truncate">{listing.title}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {listing.description}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-purple-600">{formatPrice(listing.price, listing.currency)}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {listing.condition}
                  </span>
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

