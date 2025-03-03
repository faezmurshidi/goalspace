"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = void 0;
var ssr_1 = require("@supabase/ssr");
var createClient = function (cookieStore) {
    return (0, ssr_1.createServerClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
            getAll: function () {
                return cookieStore.getAll();
            },
            setAll: function (cookiesToSet) {
                try {
                    cookiesToSet.forEach(function (_a) {
                        var name = _a.name, value = _a.value, options = _a.options;
                        return cookieStore.set(name, value, options);
                    });
                }
                catch (_a) {
                    // The `setAll` method was called from a Server Component.
                    // This can be ignored if you have middleware refreshing
                    // user sessions.
                }
            },
        },
    });
};
exports.createClient = createClient;
