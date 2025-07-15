import React, { useEffect, useState } from "react";
import { HttpAgent, Actor } from "@dfinity/agent";
import { idlFactory } from "../../declarations/icp_real_estate_backend";
import { Principal } from "@dfinity/principal";
import "bootstrap/dist/css/bootstrap.min.css";
import AOS from "aos";
import "aos/dist/aos.css";

const canisterId = import.meta.env.VITE_CANISTER_ID_ICP_REAL_ESTATE_BACKEND;
const isLocal = import.meta.env.VITE_DFX_NETWORK === "local";

let agent = new HttpAgent();
let backend = null;

function PropertyListings() {
  const [properties, setProperties] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [userPrincipal, setUserPrincipal] = useState("");
  const [newPropName, setNewPropName] = useState("");
  const [newPropPrice, setNewPropPrice] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [rangeResults, setRangeResults] = useState([]);
  const [showRangeResults, setShowRangeResults] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const props = await backend.get_properties();
      setProperties(props);
    } catch (e) {
      console.error("❌ Failed to fetch properties:", e);
    } finally {
      setLoading(false);
    }
  };

  const addProperty = async () => {
    if (!newPropName || !newPropPrice) {
      alert("Please enter both property name and price.");
      return;
    }
    try {
      await backend.add_property(newPropName, BigInt(newPropPrice));
      setNewPropName("");
      setNewPropPrice("");
      await loadData();
      alert("✅ Property added successfully!");
    } catch (e) {
      alert("❌ Failed to add property.");
      console.error(e);
    }
  };

  const handleBuy = async (id) => {
    try {
      const propertyId = typeof id === "bigint" ? id : BigInt(id);
      const result = await backend.buy_property(propertyId);
      if (result?.ok) {
        alert(`✅ ${result.ok}`);
        await loadData();
      } else if (result?.err) {
        alert(`❌ ${result.err}`);
      } else {
        alert("❌ Unexpected backend response.");
      }
    } catch (e) {
      console.error("❌ Buy Error:", e);
    }
  };

  const findPropertiesInRange = () => {
    if (!minPrice || !maxPrice) {
      alert("Please enter both min and max price.");
      return;
    }
    const min = BigInt(minPrice);
    const max = BigInt(maxPrice);
    const filtered = properties.filter(
      (p) =>
        BigInt(p.price) >= min &&
        BigInt(p.price) <= max &&
        !p.is_leased
    );
    setRangeResults(filtered);
    setShowRangeResults(true);
  };

  useEffect(() => {
    const init = async () => {
      AOS.init();
      if (isLocal) await agent.fetchRootKey();
      backend = Actor.createActor(idlFactory, { agent, canisterId });
      const identity = await agent.getPrincipal();
      setUserPrincipal(identity.toText());
      await loadData();
    };
    init();
  }, []);

  const filteredProps = properties.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.price.toString().includes(searchQuery.toLowerCase()) ||
      (p.is_leased ? "lease" : "buy").includes(searchQuery.toLowerCase());
    const matchesOwned = !ownedOnly || p.owner.toText() === userPrincipal;
    const matchesAvailable = !availableOnly || !p.is_leased;
    return matchesSearch && matchesOwned && matchesAvailable;
  });

  return (
    <div className="container my-5">
      {/* Add Property Section */}
      <h3 className="mb-4" data-aos="fade-right">🏠 Add New Property</h3>
      <div className="row g-3 mb-5" data-aos="fade-up">
        <div className="col-md-5">
          <input className="form-control" placeholder="Property Name" value={newPropName} onChange={(e) => setNewPropName(e.target.value)} />
        </div>
        <div className="col-md-5">
          <input type="number" className="form-control" placeholder="Price in ₹ (e.g. 4000000)" value={newPropPrice} onChange={(e) => setNewPropPrice(e.target.value)} />
        </div>
        <div className="col-md-2">
          <button className="btn btn-success w-100" onClick={addProperty}>➕ Add</button>
        </div>
      </div>

      {/* Search Filters */}
      <h4 data-aos="fade-right">🔍 Search & Filter</h4>
      <div className="d-flex gap-3 mb-4 flex-wrap" data-aos="fade-up">
        <input className="form-control" placeholder="Search..." style={{ maxWidth: "300px" }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <label><input type="checkbox" checked={ownedOnly} onChange={(e) => setOwnedOnly(e.target.checked)} className="form-check-input me-1" />Owned by Me</label>
        <label><input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} className="form-check-input me-1" />Available Only</label>
      </div>

      {/* Price Range Filter */}
      <h4 className="mt-5" data-aos="fade-right">💸 Buy by Price Range</h4>
      <div className="row g-3 mb-4" data-aos="fade-up">
        <div className="col-md-4">
          <input className="form-control" placeholder="Min Price" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
        </div>
        <div className="col-md-4">
          <input className="form-control" placeholder="Max Price" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        </div>
        <div className="col-md-4">
          <button className="btn btn-outline-primary w-100" onClick={findPropertiesInRange}>🔍 Find</button>
        </div>
      </div>

      {/* Price Range Results */}
      {showRangeResults && (
        <div className="mb-5" data-aos="fade-up">
          <h5>💼 Matching Properties</h5>
          <div className="row">
            {rangeResults.length === 0 ? (
              <div className="text-muted">No matches.</div>
            ) : (
              rangeResults.map((p, idx) => (
                <div key={`range-${p.id ?? idx}`} className="col-md-6 col-lg-4 mb-3">
                  <div className="card shadow-sm h-100">
                    <img
                      src={`https://source.unsplash.com/400x250/?real-estate,building&sig=${p.id ?? idx}`}
                      className="card-img-top"
                      alt="property"
                    />
                    <div className="card-body">
                      <h5 className="card-title">{p.name}</h5>
                      <p className="card-text">₹{p.price.toString()}</p>
                      <p className="text-muted small">{p.is_leased ? "🔁 Leased" : "🛒 For Sale"}</p>
                      <p className="text-muted small">Owner: {p.owner.toText().slice(0, 10)}...</p>
                      {!p.is_leased && (
                        <button className="btn btn-sm btn-primary" onClick={() => handleBuy(p.id)}>Buy</button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* All Properties Section */}
      <h4 className="mt-5" data-aos="fade-right">📋 All Properties</h4>
      {loading ? (
        <div className="text-center my-4">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      ) : (
        <div className="row" data-aos="fade-up">
          {filteredProps.length === 0 ? (
            <div className="text-muted">No matching properties.</div>
          ) : (
            filteredProps.map((p, idx) => (
              <div key={p.id ?? idx} className="col-md-6 col-lg-4 mb-3">
                <div className="card shadow-sm h-100">
                  <img
                    src={`https://source.unsplash.com/400x250/?home,villa&sig=${p.id ?? idx}`}
                    className="card-img-top"
                    alt="property"
                  />
                  <div className="card-body">
                    <h5 className="card-title">{p.name}</h5>
                    <p className="card-text">₹{p.price.toString()}</p>
                    <p className="text-muted small">{p.is_leased ? "🔁 Leased" : "🛒 For Sale"}</p>
                    <p className="text-muted small">Owner: {p.owner.toText().slice(0, 10)}...</p>
                    {!p.is_leased && (
                      <button className="btn btn-sm btn-primary" onClick={() => handleBuy(p.id)}>Buy</button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default PropertyListings;
