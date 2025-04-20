import React, { useState } from "react";
import { Search } from "lucide-react";

const SearchBar = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  return (
    <div className="p-4 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-lg bg-gray-50 max-w-md">
        <Search className="w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Tìm kiếm sản phẩm..." 
          className="bg-transparent focus:outline-none w-full text-gray-700 placeholder-gray-400" 
          value={searchQuery}
          onChange={handleSearch}
        />
      </div>
    </div>
  );
};

export default SearchBar;
