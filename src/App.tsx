import { useState, useEffect, useRef } from 'react';
import { Search, Target, Trash2, RefreshCw, Plus, Wallet, Info, RotateCcw } from 'lucide-react';

const App = () => {
  const [ticker, setTicker] = useState('');
  const [favorites, setFavorites] = useState([] as any[]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null as string | null);

  // Ref para controlar se é a primeira renderização
  const isInitialMount = useRef(true);

  // Carregar dados salvos ao iniciar (Cache Persistente)
  useEffect(() => {
    const saved = localStorage.getItem('b3_magic_number');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  // Salvar dados sempre que houver mudança
  useEffect(() => {
    // Evita salvar o array vazio inicial antes de carregar o cache
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    localStorage.setItem('b3_magic_number', JSON.stringify(favorites));
  }, [favorites]);

  const fetchAssetData = async (symbol: string, isUpdate = false) => {
    if (!symbol) return;
    
    const cleanSymbol = symbol.trim().toUpperCase();
    
    // Sistema de Cache: Se não for atualização e já existe na lista, não busca de novo
    if (!isUpdate && favorites.find(a => a.symbol === cleanSymbol)) {
      setError("Ativo já está na sua lista. Use o botão de atualizar se desejar novos preços.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!import.meta.env.VITE_BRAPI_TOKEN) throw new Error("VITE_BRAPI_TOKEN não definido");
      
      const response = await fetch(`https://brapi.dev/api/quote/${cleanSymbol}?token=${import.meta.env.VITE_BRAPI_TOKEN}`);
      const data = await response.json();
      
      if (data.results?.[0]) {
        const res = data.results[0];
        
        const assetData = {
          symbol: res.symbol,
          name: res.longName || res.shortName,
          price: res.regularMarketPrice,
          change: res.regularMarketChangePercent,
          logo: res.logourl,
          lastUpdate: new Date().toLocaleTimeString('pt-BR')
        };

        setFavorites(prev => {
          const exists = prev.find(a => a.symbol === assetData.symbol);
          if (exists) {
            // Atualiza apenas os campos de mercado preservando os inputs do usuário
            return prev.map(a => a.symbol === assetData.symbol ? { ...a, ...assetData } : a);
          }
          // Adiciona novo com valores zerados
          return [{ ...assetData, qtdAtual: 0, rendimentoCota: 0 }, ...prev];
        });
        
        if (!isUpdate) setTicker('');
      } else {
        setError("Ativo não encontrado.");
      }
    } catch (e) {
      setError("Erro ao conectar com a API.");
    } finally {
      setLoading(false);
    }
  }

  // Função para atualizar todos os preços da lista
  const refreshAllPrices = async () => {
    if (favorites.length === 0) return;
    for (const asset of favorites) {
      await fetchAssetData(asset.symbol, true);
    }
  }

  const updateAssetField = (symbol: string, field: string, value: string) => {
    setFavorites(prev => prev.map(asset => 
      asset.symbol === symbol ? { ...asset, [field]: parseFloat(value) || 0 } : asset
    ));
  };

  const calculateMagic = (asset: any) => {
    if (!asset.rendimentoCota || asset.rendimentoCota <= 0) return 0;
    return Math.ceil(asset.price / asset.rendimentoCota);
  };

  const removeAsset = (sym: string) => setFavorites(favorites.filter(a => a.symbol !== sym));
  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
                <Target size={24} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">NÚMERO MÁGICO</h1>
            </div>
            <p className="text-slate-500 text-sm font-medium">Quantas cotas para o FII se pagar sozinho?</p>
          </div>
          
          {favorites.length > 0 && (
            <button 
              onClick={refreshAllPrices}
              disabled={loading}
              className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
            >
              <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
              ATUALIZAR PREÇOS
            </button>
          )}
        </header>

        {/* Busca */}
        <div className="bg-white p-2 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 mb-8 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAssetData(ticker)}
              placeholder="Ex: HGLG11"
              className="w-full py-4 pl-14 pr-4 rounded-2xl outline-none font-bold uppercase text-lg"
            />
          </div>
          <button 
            onClick={() => fetchAssetData(ticker)}
            disabled={loading || !ticker}
            className="bg-slate-900 text-white px-8 rounded-2xl font-bold hover:bg-black transition-all flex items-center gap-2"
          >
            {loading ? <RefreshCw className="animate-spin" /> : <Plus />}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-100 text-amber-700 rounded-2xl flex items-center gap-3 text-sm font-bold">
            <Info size={18} /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {favorites.map((asset) => {
            const numMagico = calculateMagic(asset);
            const faltam = Math.max(0, numMagico - asset.qtdAtual);
            const investNecessario = faltam * asset.price;
            const progresso = numMagico > 0 ? (asset.qtdAtual / numMagico) * 100 : 0;

            return (
              <div key={asset.symbol} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 overflow-hidden">
                      {asset.logo ? <img src={asset.logo} className="p-2" alt="logo" /> : <span className="font-bold text-slate-300">{asset.symbol.slice(0,3)}</span>}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-800 leading-none">{asset.symbol}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-blue-600 uppercase">Preço: {formatBRL(asset.price)}</span>
                        <span className="text-[10px] text-slate-300 font-bold">• Atualizado às {asset.lastUpdate}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => fetchAssetData(asset.symbol, true)} 
                      className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                      title="Atualizar este ativo"
                    >
                      <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={() => removeAsset(asset.symbol)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={20}/></button>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Minhas Cotas</label>
                    <input 
                      type="number"
                      value={asset.qtdAtual}
                      onChange={(e) => updateAssetField(asset.symbol, 'qtdAtual', e.target.value)}
                      className="w-full p-4 bg-slate-50 rounded-2xl font-black text-xl border-2 border-transparent focus:border-blue-100 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rendimento/Cota</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                      <input 
                        type="number"
                        step="0.01"
                        value={asset.rendimentoCota}
                        onChange={(e) => updateAssetField(asset.symbol, 'rendimentoCota', e.target.value)}
                        className="w-full p-4 pl-12 bg-slate-50 rounded-2xl font-black text-xl border-2 border-transparent focus:border-blue-100 outline-none text-emerald-600"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nº Mágico</label>
                    <div className="p-4 bg-blue-600 text-white rounded-2xl font-black text-2xl text-center shadow-lg shadow-blue-100">
                      {numMagico}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faltam</label>
                    <div className="p-4 bg-slate-900 text-white rounded-2xl font-black text-2xl text-center">
                      {faltam}
                    </div>
                  </div>
                </div>

                <div className="px-8 pb-8 pt-2">
                  <div className="flex justify-between mb-3 items-end">
                    <div className="flex items-center gap-2">
                      <Wallet size={16} className="text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso</span>
                    </div>
                    <span className="text-sm font-black text-blue-600">{progresso.toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden p-1">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${Math.min(progresso, 100)}%` }}
                    />
                  </div>
                  
                  <div className="mt-6 flex flex-col sm:flex-row justify-between items-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100 gap-4">
                    <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">Aporte para o Número Mágico</p>
                    <p className="text-2xl font-black text-emerald-700">{formatBRL(investNecessario)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default App;