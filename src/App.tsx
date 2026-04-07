import { useState, useEffect } from 'react';
import { Search, Target, Trash2, RefreshCw, Plus, Wallet, Info } from 'lucide-react';

const App = () => {
  const [ticker, setTicker] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null as string | null);

  // Salvar dados
  useEffect(() => {
    localStorage.setItem('b3_magic_number', JSON.stringify(favorites));
  }, [favorites]);

  // Carregar dados salvos
  useEffect(() => {
    const saved = localStorage.getItem('b3_magic_number');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  const fetchAssetData = async (symbol) => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    const cleanSymbol = symbol.trim().toUpperCase();

    try {
      if (!import.meta.env.VITE_BRAPI_TOKEN) throw new Error("VITE_BRAPI_TOKEN não definido no .env");
      // Removido o parâmetro dividends=true para evitar erro de plano
      const response = await fetch(`https://brapi.dev/api/quote/${cleanSymbol}?token=${import.meta.env.VITE_BRAPI_TOKEN}`);
      const data = await response.json();
      
      if (data.results?.[0]) {
        const res = data.results[0];
        
        const newAsset = {
          symbol: res.symbol,
          name: res.longName || res.shortName,
          price: res.regularMarketPrice,
          change: res.regularMarketChangePercent,
          logo: res.logourl,
          qtdAtual: 0,
          rendimentoCota: 0, // Usuário preenche manualmente baseado na planilha
          lastUpdate: new Date().toLocaleTimeString()
        };

        setFavorites(prev => {
          const exists = prev.find(a => a.symbol === newAsset.symbol);
          if (exists) return prev;
          return [newAsset, ...prev];
        });
        setTicker('');
      } else {
        setError("Ativo não encontrado ou erro na resposta da API.");
      }
    } catch (e) {
      setError("Erro de conexão com a API. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const updateAssetField = (symbol, field, value) => {
    setFavorites(prev => prev.map(asset => 
      asset.symbol === symbol ? { ...asset, [field]: parseFloat(value) || 0 } : asset
    ));
  };

  const calculateMagic = (asset) => {
    if (!asset.rendimentoCota || asset.rendimentoCota <= 0) return 0;
    // Preço da cota dividido pelo rendimento mensal
    return Math.ceil(asset.price / asset.rendimentoCota);
  };

  const removeAsset = (sym) => setFavorites(favorites.filter(a => a.symbol !== sym));

  const formatBRL = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
              <Target size={24} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">NÚMERO MÁGICO</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">Calcule quantas cotas faltam para o seu FII se pagar sozinho.</p>
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
              placeholder="Digite o código (ex: HGLG11)"
              className="w-full py-4 pl-14 pr-4 rounded-2xl outline-none font-bold uppercase text-lg placeholder:text-slate-300"
            />
          </div>
          <button 
            onClick={() => fetchAssetData(ticker)}
            disabled={loading || !ticker}
            className="bg-slate-900 text-white px-8 rounded-2xl font-bold hover:bg-black transition-all flex items-center gap-2 active:scale-95"
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
          {favorites.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
              <p className="text-slate-300 font-black uppercase tracking-widest text-xs">Sua carteira está vazia</p>
            </div>
          ) : (
            favorites.map((asset) => {
              const numMagico = calculateMagic(asset);
              const faltam = Math.max(0, numMagico - asset.qtdAtual);
              const investNecessario = faltam * asset.price;
              const progresso = numMagico > 0 ? (asset.qtdAtual / numMagico) * 100 : 0;

              return (
                <div key={asset.symbol} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300">
                  <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 overflow-hidden">
                        {asset.logo ? <img src={asset.logo} className="p-2" alt="logo" /> : <span className="font-bold text-slate-300">{asset.symbol.slice(0,3)}</span>}
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-slate-800 leading-none">{asset.symbol}</h2>
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">Preço: {formatBRL(asset.price)}</span>
                      </div>
                    </div>
                    <button onClick={() => removeAsset(asset.symbol)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={20}/></button>
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
                          className="w-full p-4 pl-12 bg-slate-50 rounded-2xl font-black text-xl border-2 border-transparent focus:border-blue-100 outline-none transition-all text-emerald-600"
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
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso do Objetivo</span>
                      </div>
                      <span className="text-sm font-black text-blue-600">{progresso.toFixed(2)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden p-1 border border-slate-100 shadow-inner">
                      <div 
                        className="bg-blue-600 h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(37,99,235,0.3)]" 
                        style={{ width: `${Math.min(progresso, 100)}%` }}
                      />
                    </div>
                    
                    <div className="mt-6 flex flex-col sm:flex-row justify-between items-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100 gap-4">
                      <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">Aporte necessário para atingir o Número Mágico</p>
                      <p className="text-2xl font-black text-emerald-700">{formatBRL(investNecessario)}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer className="mt-16 text-center pb-12">
          <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.4em]">FII Tracker • Liberdade Financeira</p>
        </footer>
      </div>
    </div>
  );
};

export default App;