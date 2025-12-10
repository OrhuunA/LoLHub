import * as https from 'https';

export async function fetchRank(server: string, riotId: string) {
    if (!riotId.includes('#')) return null;

    const [name, tag] = riotId.split('#');
    const regionMap: Record<string, string> = { "TR1": "tr", "EUW1": "euw", "EUN1": "eune", "NA1": "na" };
    const region = regionMap[server] || "tr";

    const slug = `${encodeURIComponent(name)}-${encodeURIComponent(tag)}`;
    const url = `https://www.leagueofgraphs.com/summoner/${region}/${slug}`;

    return new Promise((resolve) => {
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    // Regex Scraping
                    // <div class="leagueTier"> ... </div>
                    const tierMatch = data.match(/class=["']leagueTier["'][^>]*>([\s\S]*?)<\/div>/);

                    if (tierMatch) {
                        const fullRank = tierMatch[1].replace(/<[^>]*>/g, '').trim().toUpperCase();
                        // Expected: "EMERALD IV" or "CHALLENGER"
                        const parts = fullRank.split(/\s+/);
                        const tier = parts[0];
                        const div = parts[1] || "";

                        let lp = 0;
                        // <span class="league-points"> 25 </span>
                        const lpMatch = data.match(/class=["']leaguePoints[^"']*["'][^>]*>([\s\S]*?)<\/span>/) || data.match(/class=["']league-points["'][^>]*>([\s\S]*?)<\/span>/);
                        if (lpMatch) {
                            lp = parseInt(lpMatch[1].replace(/[^0-9]/g, '')) || 0;
                        }

                        let winrate = "";

                        // New Method: Calculate from Wins/Losses
                        const winsMatch = data.match(/class=["']winsNumber["'][^>]*>(\d+)/);
                        const lossesMatch = data.match(/class=["']lossesNumber["'][^>]*>(\d+)/);

                        if (winsMatch && lossesMatch) {
                            const wins = parseInt(winsMatch[1]);
                            const losses = parseInt(lossesMatch[1]);
                            const total = wins + losses;
                            if (total > 0) {
                                winrate = `${Math.round((wins / total) * 100)}%`;
                            }
                        }

                        // Fallback: Look for text "55% Win Rate" (en-US forced) or pie chart
                        if (!winrate) {
                            const wrMatch = data.match(/(\d+)\s*%\s*Win\s*Rate/i);
                            if (wrMatch) {
                                winrate = `${wrMatch[1]}%`;
                            } else {
                                // Fallback: data-percentage near pie chart
                                const pieMatch = data.match(/data-percentage=["'](\d+)["']/);
                                if (pieMatch) {
                                    winrate = `${pieMatch[1]}%`;
                                }
                            }
                        }

                        resolve({ rank_tier: tier, rank_div: div, lp, winrate });
                    } else {
                        resolve({ rank_tier: "UNRANKED", rank_div: "", lp: 0, winrate: "" });
                    }
                } catch (e) {
                    console.error(e);
                    resolve(null);
                }
            });
        });

        req.on('error', (e) => {
            console.error(e);
            resolve(null);
        });
    });
}
