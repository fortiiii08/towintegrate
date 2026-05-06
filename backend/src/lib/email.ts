import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const ALWAYS_CC = "criativo@digitownmkt.com";

// Logo as base64 — used as CID inline attachment (works in all major clients)
const DIGITOWN_LOGO_B64 = "UklGRk4hAABXRUJQVlA4WAoAAAAQAAAAfQIAkQAAQUxQSHAcAAABoEf+/2+1e7lyXUmSJEkmSZIkSZIkSZIkSZIkSTJJJjMZSTJJJkmSJEmSJEmSmSRJJkmSJJMrSZJcV/L645zP55zP5/zo+91fETEB+P+2nuE749tJAH4+vSZTVWxZdVlpUV5maqxbBVLTUpWnJ2sQn56qPC095FsScsvbB3/OLyxMDXdV5Sfp0krhfdDPlZNsUnRE4cv5xkhjQarrBPfJd+XkirIe8l09H3OVxHd2ddja2d5QWZyTrFNOf4dpX7UmMflf/9Dq+feCGB1aRHcBP3dG8m9ASRst3843ZcW4yTw17VNURE2PleRS7d1aZ15Qk34K97RIGnqlva+DCR+kB5IvcUrarRmf56sSXWNflwlFHbq8xKnIVmSMTOVp0adTwhJVToU+RHfqcGCL8Vd9vKf89AMkb+pc5RtVt/03gMrmxvbeodnto8snOZKrhW7xdnz2qGzCYS+X+/fuQN6WuEbyGdVv/TcgG8hqmTm6lyHvO4Ku8BIHZHas3brUw+6XgiCw6BbkkkuUU8ublP8WzLMHD55FJEfiXMKYMRl2ndfVEpgvuQfDGW7QRE2fMhS0ih6CHyxjzeaziJwIuQaA6jNXefgMSXW5GpFlzquj1bfb499bK5u/j6+jFniXZF/V3fGR8Xor8AEDUHcgIr+5CFBy6RqvHZBWl7q5tWa6vjg3L56bX909uni0xkqnFVI+utOWBHF848arFA/s+yA6CYgffxbwtd5FgPZ3d/gJi+rUZvVsP1pgvrPi/0q9D8N6/6sMf3pMynWFiu05HZr3vQNA+50ZeZjqIgjtucB9LtzEWH0k9zfeUcuUXQ3A1nkZljsuM01N0myNXAYbVISPdOiPegrQFDYjB1wE+Oa4NVh3HpB7LsMlJ3VQtgN2t8nsOi2Td2pqeSD3SdGBDn1eA3S8mvEs1UVQ47BBuBIwIMMW5yQ+ytTD/iYJNjpskKxRkjhX7feAcTOy1UVQ8OakLrgVqmWuYxwzRMk2qByU2HRWkO2z10os+zOkHZtx0UWQ9+acDrgXaiXY65T0N4kJqD0QMcdRLUQx062ltn/vKzCJyUkwS+34/jkL6YKklsGBUolQ3bevJTLxzYNfim0o6htsipXI/zzY+UmU1vG9v9TNgC4zXia7B8oc8wVuhq8S1wGHfKP4GIqrJUYcdXEGcNbSFF/Cj7yIBZDCTpNJvoYfORJr9pWR8AOv48wayft7nuHCrJfR8COv4y2k/OVD+J1pjRFD8IRP4Qh/mI3yJfzIh3Q3Q8KuCd+r3APNDpmAu2FbxFZnhO4kKlRhU7RtT/HWwrxxbSKgJI+VwAit7LAJQFb0NSSxzSYAhZFfr/UAptgLII13Jp85CSD24uh61zDKrwBSHyIhqUzepAD4cT9/BSD29S0LQA+HDGNsApByw3Q3A76YkF3ugR+O+AW3K5FYdkYzxctQ3ip6SbSljcKHkJLpKIBMtsh1MxfGRM6IOpkPY+IzK4F49sNYxCoAWfwO0xUuAihiK4wxXJG6vYVpKy8BtDIexkUCSGIPjPFvbe6GkmcTDroHDh0QzXQ9rIj4yREzEhXqkiMCNtnSIroLqAjyJwCc3MhFd2BeXyaK/IJ5N6sApMabhDgMYOod5tlcBbB9D/Ov7zLFLDXDUwRAbDZMGxgPpLLDBAkBl0P8kQnH3CPPAV1wvwaJFieEwqJf0LBve944t1fnnDbGGSqYKZPBBoHRJJ3NgjzWQTKfowAe9wXgDgBOCSqYJvGFEM4SskMG7LHCxFaXAZZMOOEamNBuDx6AC9GYE2oo/q6DYk1On3Irq6pKqjgtU8Isa8XMEaSz0ST1y8z+8zv7AfCnKHwAxL8wEjXlm8xiVNQXNSsbXbqI8iEEILhP/p5oCHgBRk047hq41K3CE2ZFJ07olcjxhCLynSTfeKXNJzYY1vh0st3+iT/s4GpTn7G/ry7GlgGTwmdeH87nNr4mwJg79+eB7PACfDHhkGv0abYMT+gSvac6YEb0B54wz+TUjIyMjLhyNklksNFaOpsFhawDcMBaAAhwDMDjviCG2wA4Dju/ULRCAFk8TQSAmnczY2id1V6Azyb87Ba41KvSG3JErHLAiWjJE+I4A+HFtQSiu4LarwJEfgm+sAooZQGMCRwBMPUuyOcKgM1nQSAgU8xSQeQFwGoEpu2MA+JzTICn356AbhPWu8WwVnvwBlyL2vRLeBWNekI/k0RN/CTxmTlm779FPcwxSX8xVDPNpJP9ALL41WydSwAK2WY2eSKDu2uzbp4D+PVkds0Q8IVxgk1vQL8J81zi07tOnV6xI+rVr5jiVkvB+DiV8QGH/N2HOIaLEvjNRgCf7l+DIuyzAUA51x8bgQSeAIiZe+YsAsAAxwAk3m7v/gaAUQ4DCCxwSCqbF8kAph8mDG3sBpBz+v6aA6SRVYY1ZnsEhk1uY90B6zp9clTSyOiQcXgiS92i6Lt+1RKllnr4ojDCcmdUsk4CPymDFb6eP/A6GRJYZ+T8kWNgM4Ay8vqazwmtZDeAfvLqlqfYOjFggLy6JVshn/vM8AWZWfYIAFOMXDxwAYc8iUXiH0Yvr8k6eAVmDdxyiQGNVuCoXIpr1c2IJvVrFr2nWuqn2gpnZFZANq48TgbJP3YXimGMKUkyQdrPvZ9pQGESAAQ+76xUAahdzAGAYN/OSimQlWOCQM/WRgusV69udwGJBQZkTO+OpwPB4SEA+PRja7UFtroVdgz85g7ZGvU4K1uiRt2YaFm/DtFTrKU+N/LFrhW6MbDMFXCiT7lnjIrW9esS/Q38t4V8k9uQKyxp8xjrGcOiXf16RJf4jwtdBk67wqg2e/CMIQd1i87/88KygRVu0K7NuHeMitb16xHd+J+SGmekNAR9Q+iv4TLgAmXaDHjHmGhFvw7RY8hSv+/YudckmB6Qq2GSDalxzqrd3VxdmP7Rmacdyg0ccoEMbTq9Y0Y0qV+b6DXRUmZ7g8LGlmQP2tZlkINWkq0V89BRmRSHNybK9MK0gZnOS3jVpc07FkVD+tWLmGfJgX6hn73K8rjjqB4J49V0gU6hO8OK8+JedGn2jh1Rr36VEtXeUstD1wrEQhmCAUcVWSB51KQPWg0sVnToIo3ecSNq1S9DYsBTcrlV61qW7VGrATqu78JRKfKqURvsG/YUnbhIvWfkUFylX+BONOUReScPz4/b18MAkudjg/tvXALQHX6Ovs6bDQ+g4+458vxD9PXh9eW+G5uCscfX1/ses9DK0+vLwze57NUUk8Kz5+jLKkoF1dcvkZfVkCFmrc5k5vEl8tgr6Ay/RJ53krUAEEjIrWkb3BeRxzm6FBlYqubCRRo8o0f0lqIftkQb3tDK857Gtg2OAvj01Hz7t2f8K7DMte7WcV6ZHK0PcqmzbZG/zU4439k+x77JsCH0lz/bO9a4aIh/4kh75yo3pcqZZfjCP71tAy+nDU8m49zraRvmexqAWA4CiA3zZ0f7GmdM5rna1T4cZbYmwrSm+XczckwTrBt2lMSEfdi86BAOGBbdh7QYWZo2XS9wSCbnYGxhOZD8yGkYh1kMAJ84Y1ji30wAKOaIYZtpAJB5ziPD2WsQAMrZD+DXC4yFHJIpYyaAGvbBuMS7RAAdbIDx7hZADL8BuI0GAKCDJQDqWA7jzaNeAJK6r814lq5HroF5KtLefdiVaMQJbSI26ZBPcbZDvjFkgrctIIl3MB0YhenWq2GFhTD99QqghJUwreA+gHpmw3TyDYjhhAl6m629/Ib5M+OAGM7BNI/VgsB8FUw5D2DmHab5A9oBaLwxIWu1wLphTkU9/VcLxU1OyJOY1aFHtA+HDBPmD78Nk2bi8XfDryjMhwlg6g1CXgL4dQ3zQmYD4UszeZN8lgoGGQ/UvCeZ4X5TIHm/A6CbGSaAE4C+dxN+0SLf8J6uYMKHbYgiKU7AieguqMEv0aRTKtlhksc2IIWdUik9q7wyHIQFnyMALs9FJ2EAVy8jM8aJZdYApXz5kWdPE+MEdUwC2jk5NWMc4ZGFnOFdzgDAKdfrgs5Bym8TjuqAXyT5WcGh/6qieBaO+CZiv7pyiuudgkUOBIEOHsLQIRq8CjOyeXdjoddwvyfafADwlzf34XA4/Bg+yQGQs0++3c3GWmuLQFjJZKCPf+/D4XD4/vH+q0T88vUj75c5Z4gZeyMfD4qdAnw14agOtYYr+0IP/uu3RKMzSiXO1C2KLuAYnDD6N8J5mHSaxV5wuS8fGH+z0BcFcHUuOgsDiCzCcsGXFb6mW2pmnKCeSUB/BNJmhXyb7EwD7rcNAFI6Jv6yzzGoMeGABrgkyULbmum7Bik+gzOwJ+KgqgqKJ52zeJRd3t8cBwsrjIdx0pbZqIgXAPYerAEI8relAhYLfjAeqOInG3gA0weRcZ7OQf6LgU0ajBgmbNvyXfWU7HJKm8R7rqJjiWzHlDMLkhJcgumfiB2lLDer5j6ARmabZXYDZbMBE2w/WUJkzywmwjgghvOC7nxBHqtMEjkHhOaKzKqchOwXA3PUpb2TvA/ZlPzqt2ooeQ6n4ELEUzUTFC/CMQVssyV8YdLLCzuwz3hD9vnLMQCcR2JMrp6ACo6bBLlgrYGdJuu8TALQyUaTPpYL0jlossEpANGXoMn8m5OQFzWcB5ThgCSLbBqmz+qnbINzWiW4o6KbknnOQQv/7h8dnVz8MOkyq+RVZ83Q/eUAZxqBY1G/SeCSSw2NK+weDRtCt1xqrJ/m2ycAPXwar2+Y5G1AppxZAPCdZz3VQ+9/qsKpADDG08/VX27YByCWgwAmuNnYMMOlWX6vRcoz19tr+m9Y7yhUG/hTXY9h1J7Arb/KO6HsApyDbQkehmzrpeQ4nJO8djg/Ozc7tcHbEOLXysxQekk+L8VhjHvAtwlB1YwBGHol79rQPGEAvj+RkckQjDlbb+TrVAiyWUvJBlSek5FZJE4nGFB5SvKwCAACS7UA0PNC3n0D9jgExAw9kDwsgrPwxcAyZSlRklf2fKWfqtym9G2Ck3Jl+FRhT8wKJS8DDjo7gXkslyEfE4LSYAzkgyHIhoKwPRCCfCAEy8EgpGNCAJyGTcOpMhyRZJYdcQ8+pcqGlPbpS1oshJPQLUPuFNrQdU/ZcjgnmU0CnJxa8JFOi38gyS5lw4YWOxbpU5Y+D4m/D00s7p78faflSjgL41LkzUSuVNnSC6W74SA8Hwsq2PAxQbvhIU5VvmHBhir6FR0r4DSsyJF8PP21MjX2c2nv9JkWR+CoPHKuqqCo64Kj+KDgiCS7VOEvyRtrob++7T4LzsO6FftH4SzETry8v7297ebjw1JhuA2o2ifJT5a26NfWoFgXzOjRC6cBiP2UDD/rPBySZJWqMUOplXH6tIdKuAQ6NIiUwg38rgs0GtZU1Rp6LPTTn923QL0+SD5UtRHEfyG4JvmWqig5SnJerou+bLkYOmoEVN6quCmG6v8MZkiyRhFuSB5LfaEPyVX0evCtOA569usEFG/bdVwO9W2ix9DHrtgwp+qI5HOcxBSt3gf9QNLI6JCtw9/726oKM0PQt3hqyHSqTQsgsW7pydJJTxp0zJ0cHjKO9+Njh1uSt6o2STJdEHdEy38DfsDLYzKKW4bn1vd+/dqaH2osSMRH2hW2STJD0agh16z5ndbvPngfelf4YihT9NlQakg7oJ3/dpQaehRVG6qBpBXa+29HwivJSUXFhqaEPdr9bwduSe4qSjc8R/lPRmx8nNpAzAXJU8TE2RublJ5X/XnNoPKfhllGXhQ/v5Hky/OLvc9R6vgvQzW98CHoBcv/03zxhGt4wQLJp9j/X/o9oc8TmkhO4/+XPlWvl/srDyQfBr8NKfwy9k7yd/eQvcMTVfAEVO4N4P+lt7Of5SEAFyT3oDY5SnIATnWN/yed9HcwHqaxTyQXFRWQZOe/JKdlEOeS5DdFFYa6f0euSyDbYahR1Goo/2ekB/KLhlxF3w35/4j8SYTFM5LP8YoWDZn/hvyE1U8kuQ7Fv0m+JnzokrKLyivq6spLCzLj/9vpgOVBQ5uqC5Ln8DmfivI0zy9K0CWQ2bp8Q9m386m6VG0yGirEtYV25dVVmNfn21VSUyEsb8y1J5Sfn2dalKQqlJ+fZ8wviPWsWlg/NWQqCj2QXPM769S/RY/UwQfaetERr0cTZaMpNp1TPGZTcpSyTfZkU3yoKo/iYq+qgfViktyH4gKSHPA7a+6Us0eFs4k6xD/JsNuePEoW21RM2fugKg76nFbYuGFoVtVtqPiAxW9R8bgGmJNasKdN4gI2f5HahTLm6lLkTUOwMYsknxNVrRiyP14dVP9coq5d6tKeMYlFu35JdWlw6me2YOeGYQSqz0g+hD5cy9RyWFm2FKts+SPRZ1NyVCaaogF/+JenJDvKSPI9XVVylOQqPljBY2q6pgo7UhN2ZFMy26Yiyp5ABxb5lgbYeW4YgepWkuzyPesOaFMSe0HLb/c319c3D++WuKeqT+qXHc0SR7C5V+qHHpd+ZQ12/iTJh3hl64Y83/PtdMv68qnobWd9y/L2SbmK4B/KP64MViYHACAmpWZ47UmOO4pKpJhtw6jEtF17Ujl6cManZNlRR2MLlN+SvIvxPfa2iV7ioPkWpS+6grAY+nwpxTk1OJcasOFEot2m5KjMJTRhrX35EsXeMwkbMyKGDSgvJ8kZ+LJ2x4xS9qUVtna+yPCzmmGpVWtZFEeSbSqi7II24VjbYouLi4zFJXHek21D7DVJPierWzBU+LMOp1RR9nccbE48kmGekgap+1hLTRLbsLlHqlobLtnmxvpswMY/NNZB/Q3Jl8SPVMyFzDQULsvsKYl7kGGLpSGJCbt2ZMIx+rDZf1RaCx7T+B3qa0lyAR+pb5SchtJlCXarwJzUtKUDiTqbkiIyO9DoKclvPMRaSr2mcQEabhkqPlLpUYkdKD6UuFDSJnViJYPiuxibCinbpRM3/MYMrJa/0rgODVOjJMPBj9QQxeFEVTkS7FeRLcUCCw0Sa7C5SyaaosF7RMROn1FlZZCmG9DxB0kO4gOV8CjRCuX9EkcqsC01YmFAYsSuLZljaMDuC9Frur9Il8s7o+kydIy5M2R9pDoo3oSGZyLWqeiT2rCwI1FiU0pUZkSL9HIR93zFNWRT5mg+Bi37SHITH6kNiUodOiTmVJRKRZKl0t5Fl7C5jrK5WhRjS8ReP7EqkTVJ8/dG6HlpKP1IZVG8Cx1jw6IrFbiQYYdUPcVLdvXLXEGLCqS8it6yfMSgWVLzFoVHqdCzmyQP8ZFqk+jVAiMi1qgYkZqX6pfot2tdZlEXtIh44CNqgdTa7jWKo73QNHBjqPlQ/RS9JulRIzGuokHqQmpDIsemxFeZWm2wLOKgf1hbuKL0YiJ0/U6Sx/hQ/RGtQ8+YO9GaivhHGVZIJL2KTmBzHSXDMfok3IuY5xXx6uTfljKhbeKzoepDlU7xuCZYEF2owJzUuEQdxbN29cnsQh/USPzxiGiSThcjydB4gST34AXt/qFaokmXPhHTVbRL7Ur0SXTatSLTpROmRfzhDUzT5mCqDFqX01joCR3+oU0iw0r9+FfT8RorTRJVKrKlmCFalki3Kf5J4i1Vq+C1iMXekK3u+Xx77HN9MnS/MozDE/r9Q6/oFla3KJy3UibxWQW2pPoF8U+iXdhcR8ljaIUSieuAJ5SoK4Ejp0nyId4bhvzDd9GepTXb0t5Fw0p6pVYENRRP2NUnM6IZBkWc9YQWdYWOqKaxCd4w5R9+ija1iX0UTSgpkbqLMeuVaLRrWSZbNxyJWOcFU+qKnBB/b1iDRyz5h3nRsja4Ek0pwZkMm8w2RQ+xNsU9SlxBuzyJcKwHnLnSFkm+JHnFvn9YFS3pcy6aVTMsNWXW/qXb9GstjFUna6YnLYIaSi7oh14Rlz2AaS40TGMDPCLx1T9sOuBCNK+mXurYzHIZhauCXpkaB2BXxBYPqHafRhp/wisa6R9WHHAumlET9yjDPHtwLrgWLEmEY5zw6U30lOh+865TQOMJPGPCR8yJVixt2XcjmlKDWanvNo0LWG4SepDYgRPQLuKG+70kukzqoyHyyTv2fcSYaNvS96s90+svVuKeRWOK2qTWbWoV/TCpomSnM7AmYpfrsdFdQlc0VsMz8ukjBkUHluzPpHhIUZbUc6I92aJ1k16Jt1SHJL2IXtNc79BVYv7Q2APvGPcTPaKHkC6VEh2KsCPDDnvwR/AQa1iUOIZD0Cjiruux1EUCJzT+gIdc+YkWEfN0aZUoU9UrNWfTsICNAIJhiR+OwZyIfa635x7BPzTOwUN66SfKJTp1GRBFklSVSp3b1Cj6CaCCkrnOibsTvWe5HSvdIvGKxlV4yYmvSIqIJnXZEB1D+bkMS+3JEO0A+CxxBeegSsR91zt3iZxHGtfgJX30Ffgt+qVJSlS0rG5Easwe/Ba8pQLzEotOwoSIg27HAVeoo+kavCTuzmcMiZitRxPFg+rqpbZt+ipgB/BXos5RgQsR892O+S4wQNMFeMoMfUaDxLAesxL56uKfZJhuT71oGqUUh4OOQonEietdBp0WWKfpODyliZL1/iDpRfRHiwyKj6DhnNRne1LfBIdol9iDs/BdxB9ux1WHFd/TtA+ekv4k0+wPMCNilw7fJcZ0aJdasgebAmJIostpOBaxxO045agpmr6XwlvOKNviE+okLjTIomSODplStzb1ifo2RZFkx2VLXLseR5xTEqbpeRK8ZZs+BCci/lC3ILEGLbdlWG9Pjej2WXQMx6FLxHnX46hDgqs0n4Irq1inL+mQYIWqNkrW6NErNWlP7KNAdtQFsC1iretxxhFfaf5eA4/Zoj/BucRDippCSm5CzxKpA3uwaEOOG6RFRXch1+PvGO3anmi+HQtvif1Dv9Ikwet4FdmvMsWa4EyGufZ8tnYFN0CziCvux+civdrvaf7WANe2qyRC34IVCT5m2VcUpeQkdB2W+mZPhbUFd8CyiC3uR07pExx+onA2AI/5QRt9RNqLBNll1wBlz6BtvdSaPbi1VOMSCU+ipwQP4HOjHsXb7xQeZsLNbSkN09egQYoXRXaU31K6UJ+4R5nHOHtmrYRjXAI1Im56AXldpyx7OkzxVSnc3YacQ9rrJ/BNirzsi5NL/HZL+Q5oPCvDNnu6rOzCLTAtYpcnkOHBkH0xNSt3lLysgNtbqj2h3b4Ck3Jk9GLje0tleXlV+8jW1RstfoPO7VKz9hRb6XKP0F/Ra6o3kG/HA2lAr6FQIrV5/vSVsr8K4f4mY2ZlS4+0319g2oLSb9A6U+rUHlzIRZLdA2Ui7nmF8Xb1wFCNpJyKzrGtP3eUfxtLgxea/ERh++zxE5X6DAzp0gHNd2RYbM+k3AZcBKMi9nuI8O05Shu3KmLgjSaRCNX7DdRp8VQA3XulRu1plxtyFZyL3jNd5F4TG9/XahLgmSZa+g7E7albhP5lUlv25MnluUuBiIcucuuE98P+glh4qX8DKu7UnObAiecy0RRbcCpzCHfBgIjf3WNYs6eDiYbceHitPq0u1Ok4oOrUvr1COHNEhr32/JCZdBsciljpGujc3VjTcHNuuK+hNC89CE+Oe2BExzc2uVBD5PLCeH8S6xjgU/+VHcedyXBqHd8iQs7b08S3iOk7a3XJuL69MF49FavKub29MJ5x2z18cWJykpbJQRdyzdSyvuWD06ubu783l39+z3UWJcHBMclJ4uQke2KSk8yTE+HicUG3AFZQOCC4BAAAUDEAnQEqfgKSAD5RJI9Fo6IhE460iDgFBLG3eA9ZvhCPIv4p+NbPM7iafz6r+Unf/wP6X/KflZ/W/3G7PqpdL/ZWr0AAjrr1IDWrvkQeexluTQ3X+qqqqql8lT0TH6dYcf+rCjhZ73uNFsqCe//b3iNpfdLM2lVt23svdHd3d0Ru4k4ZnSVjSaksXIK/U0XCVSezvg6YKTQqqqqqqoSen/87hxRw+1ayf1g8DP4VX6kj37XzQqqqqqqohlNJi2lD6DYUAl+ij7405cwTLSJcD4M7AMYhNBCaByvHtz8uRRciLJFFyKLkUXIouP7x08sS5U/lncRcSi4SCLovj+tn9bP62f1s/rZ/Wz+tn9bOoC/WvtYUAf3XSC3jp2NcCnBrBNo0Ss4lOrVUzGrS+U1mFVVVVVKKkbgtK66ncxHHuQCfLNQciZOWZS3EaaK6aYW7u7u68aU+Etm+CBLtd8JeZNpYJtcXazLrJ4hXru7u7u7u7rxTByl7pLOqnWTqKjlpzu/UM413d3d3d3d3d3dlz6QOAAD+9+flmgm8GfktE9HbcPFYiqEcQAXo9k3ZDtNUg6BG6P3ITctNEhalrS2GmQF97T16wiJ7v9s918Atu/l9tmZH4jigs2eQMcpt3X+HqngsIVUuC8VZf+3qH3Lu9BNHTk//mX+hl73LYE8IF3wmHv8n79j5ipPUoVBYPhmIHOx/g5ElgNV6dLRREfnv9HJlciQklmF4aRbVJZZH2h25o29Y6TTJ0NBAB81yIUUY8f5qPaejBRSsmlFTMGXDI0XsxxFAaB6T+iYGu3Jn79FgswxzHL18+Rpg//GEcJ//2utKElVkLFfQ4YAAuB//sGcCuHcyGiI607xVhiawxTWJrAxa/RGXe66S4+DgnmX6xdA/8+ha9ILcnFPGy7yZkWlLzBgDkFOpv4rVfWY9vu3/k1EXhjzMZgTg6SFiTXzYpkFD7wM3DjmXZ4lPFoBViUPG84PADr92Rp65J4y/wKn9Cb+xDP2rASSswh5jVU3CE+uQ2WCNhwuh+KHMJ+GtlMmBfw4eJZvsPSFUiYypuoE24YkOxqMqr8qeJOBwADak6uZkcgFUMFLkJH4nbJzU7vtmi/4Tf2+3rwwx7iHpfh91drT4PJwnoQh0aURc4OcxUVOVTvWejmvTCN7S/qWCpzm1UYYtrKkJE/C/NlBAmgACjMIufWkAtvvGWdiij6PlmEqibHVAV36/F3AeWvZAJ6ASn7uAKAACrW1L2TvI2RB/e/r01tbklfURf+QfBF8JZig0QotM6mZv3q6XtSwgHdoP67dibB3/H5PpjYJvYbusKL58e8BbhhL425v11tBmeNRhE/tgXnTkrZl53zLdMhDOCzELUN+4PpvNzx//TZX8jFZfHy7tW0QAEROrm0PUPUQTBzva2WRJvqulvGAIGMR3GZ2p8KIZnFYdXXdSdK0Emq8MoGmIADB2WHkoIs0U+1VX/lcpDslcBOTwJ0zlGfX4L4r3sGp9YNtTAFG1U8obFnZmfbHht/ADJ+txl/3zGvlB75jnW83/+GS/1N5BB//hkv9Tf6NncHTAAD95z8mU6XicslwwGdm9z3j5+uVr//ZXl5WkgAA";

const logoAttachment = {
  filename: "digitown-logo.webp",
  content: DIGITOWN_LOGO_B64,
  content_type: "image/webp",
  content_id: "digitown-logo",
};

const logoFooterHtml = `
  <tr>
    <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center;">
      <img src="cid:digitown-logo" alt="DigiTown" style="height:30px;width:auto;display:inline-block;margin-bottom:8px;" />
      <p style="margin:0;color:#9ca3af;font-size:11px;">
        Este e-mail foi gerado automaticamente pela plataforma DigiTown.
      </p>
    </td>
  </tr>
`;

function fmt(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

interface MilestoneEmailData {
  clientName: string;
  clientEmail: string;
  extraRecipients?: string[];
  assinaturaCliente?: Date | null;
  primeiroPagamento?: Date | null;
  reuniaoBriefing?: Date | null;
  materialDrive?: Date | null;
  acessoRedes?: Date | null;
  entregaRoteiro?: Date | null;
  dataGravacao?: Date | null;
  analisePerfil?: Date | null;
  cronogramaMensal?: Date | null;
  google?: Date | null;
  landingPage?: Date | null;
  linkedin?: Date | null;
  trafegoPago?: Date | null;
  entregaAprovacaoPosts?: Date | null;
  solicitacoesAlteracoes?: Date | null;
  primeiraPostagemFeed?: Date | null;
}

export async function sendMilestoneEmail(data: MilestoneEmailData) {
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";

  // Build recipient list: client + any extras + always ALWAYS_CC
  const toList = [
    data.clientEmail,
    ...(data.extraRecipients ?? []),
    ALWAYS_CC,
  ].filter((e): e is string => Boolean(e?.trim()))
   .map((e) => e.trim().toLowerCase());
  const to = [...new Set(toList)];

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Seu cronograma</title>
</head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#18182a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#407b75,#1a1a2e);padding:36px 40px;">
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.5);letter-spacing:2px;text-transform:uppercase;">Seu cronograma</p>
              <h1 style="margin:8px 0 0;font-size:26px;font-weight:700;color:#fff;">${data.clientName}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 28px;color:rgba(255,255,255,0.6);font-size:15px;line-height:1.6;">
                Olá! Abaixo estão as datas do seu planejamento. Qualquer dúvida, estamos à disposição.
              </p>

              ${section("Início do contrato", [
                row("Assinatura do contrato", fmt(data.assinaturaCliente)),
                row("Primeiro pagamento",      fmt(data.primeiroPagamento)),
                row("Reunião de Briefing",      fmt(data.reuniaoBriefing)),
              ])}

              ${section("Onboarding", [
                row("Material visual no Drive",  fmt(data.materialDrive)),
                row("Acesso às redes sociais",   fmt(data.acessoRedes)),
                row("Entrega dos roteiros",       fmt(data.entregaRoteiro)),
                row("Análise de perfil",          fmt(data.analisePerfil)),
                row("Cronograma mensal",          fmt(data.cronogramaMensal)),
              ])}

              ${section("Gravação e produção", [
                row("Data de gravação",            fmt(data.dataGravacao)),
                row("Entrega para aprovação",      fmt(data.entregaAprovacaoPosts)),
                row("Solicitações de alterações",  fmt(data.solicitacoesAlteracoes)),
                row("Primeira postagem do feed",   fmt(data.primeiraPostagemFeed)),
              ])}

              ${section("Marketing digital", [
                row("Tráfego pago",               fmt(data.trafegoPago)),
                row("Google Meu Negócio",         fmt(data.google)),
                row("Landing Page",               fmt(data.landingPage)),
                row("Postagem no LinkedIn",       fmt(data.linkedin)),
              ])}
            </td>
          </tr>

          <!-- Footer with logo -->
          ${logoFooterHtml}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const result = await resend.emails.send({
    from,
    to,
    subject: `Seu cronograma — ${data.clientName}`,
    html,
    attachments: [logoAttachment],
  });

  return result;
}

export async function sendRecordingNotificationEmail(data: {
  clientName: string;
  clientEmail: string;
  nextRecordingDate: string;
  recordingTime?: string | null;
}) {
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f5f6fa;font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6fa;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:36px 40px 28px;">
            <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.55);letter-spacing:3px;text-transform:uppercase;">Gravações · DigiTown</p>
            <h1 style="margin:10px 0 0;font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Nova gravação agendada</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px 24px;">
            <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.7;">
              Olá, <strong style="color:#1a1a2e;">${data.clientName}</strong>! Sua próxima sessão de gravação está confirmada.
            </p>

            <!-- Date + time card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#fff1f1,#fef2f2);border-radius:14px;border:1.5px solid #fecaca;margin-bottom:28px;overflow:hidden;">
              <tr>
                <td style="padding:24px 24px 20px;text-align:center;${data.recordingTime ? "border-bottom:1px solid #fecaca;" : ""}">
                  <p style="margin:0 0 6px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;">Data da gravação</p>
                  <p style="margin:0;font-size:26px;font-weight:800;color:#dc2626;">${data.nextRecordingDate}</p>
                </td>
              </tr>
              ${data.recordingTime ? `
              <tr>
                <td style="padding:18px 24px 20px;text-align:center;">
                  <p style="margin:0 0 6px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;">Horário</p>
                  <p style="margin:0;font-size:36px;font-weight:900;color:#dc2626;letter-spacing:3px;">${data.recordingTime}</p>
                </td>
              </tr>` : ""}
            </table>

            <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;text-align:center;">
              Em caso de dúvidas, entre em contato com nossa equipe.
            </p>
          </td>
        </tr>

        <!-- Footer with logo -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center;">
            <img src="cid:digitown-logo" alt="DigiTown" style="height:30px;width:auto;display:inline-block;margin-bottom:8px;" />
            <p style="margin:0;color:#9ca3af;font-size:11px;">
              Este e-mail foi gerado automaticamente pela plataforma DigiTown.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const subject = data.recordingTime
    ? `Gravação agendada — ${data.nextRecordingDate} às ${data.recordingTime}`
    : `Gravação agendada — ${data.nextRecordingDate}`;

  return resend.emails.send({
    from,
    to: data.clientEmail,
    subject,
    html,
    attachments: [logoAttachment],
  });
}

export async function sendRecordingReminderEmail(data: {
  clientName: string;
  lastVideoDate: string; // e.g. "15 de julho de 2026"
  notifyDaysAhead: number; // e.g. 30
}) {
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f5f6fa;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6fa;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:linear-gradient(135deg,#407b75,#1a1a2e);padding:28px 36px;">
            <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:3px;text-transform:uppercase;">Gravações · DigiTown</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#fff;">Hora de agendar gravação</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 36px;">
            <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
              Os vídeos de <strong style="color:#1a1a2e;">${data.clientName}</strong> terminam em
              aproximadamente <strong style="color:#407b75;">${data.notifyDaysAhead} dias</strong>
              (último vídeo: <strong>${data.lastVideoDate}</strong>).
            </p>
            <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">
              É hora de entrar em contato e agendar a próxima sessão de gravação.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:18px 36px;border-top:1px solid #f3f4f6;text-align:center;">
            <img src="cid:digitown-logo" alt="DigiTown" style="height:26px;width:auto;display:inline-block;margin-bottom:6px;" />
            <p style="margin:0;color:#9ca3af;font-size:11px;">Este e-mail foi gerado automaticamente pela plataforma DigiTown.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return resend.emails.send({
    from,
    to: ALWAYS_CC,
    subject: `Agendar gravação: ${data.clientName}`,
    html,
    attachments: [logoAttachment],
  });
}

export async function sendMeetingInviteEmail(data: {
  clientName: string;
  clientEmail: string;
  extraEmails?: string[];
  meetingTitle: string;
  date: string;       // "DD/MM/YYYY"
  time: string;       // "HH:mm"
  duration: number;   // minutes
  meetUrl?: string;
}) {
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";

  const allRecipients = [data.clientEmail, ...(data.extraEmails ?? [])];
  const durationLabel = data.duration >= 60
    ? `${data.duration / 60}h`
    : `${data.duration} min`;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f5f6fa;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6fa;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:linear-gradient(135deg,#407b75,#1a1a2e);padding:28px 36px;">
            <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:3px;text-transform:uppercase;">Reunião · DigiTown</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#fff;">Você tem uma reunião agendada</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 36px;">
            <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
              Olá, <strong style="color:#1a1a2e;">${data.clientName}</strong>! Sua reunião com a equipe DigiTown está confirmada.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;margin-bottom:24px;">
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Assunto</p>
                  <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#111827;">${data.meetingTitle}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="50%">
                        <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Data</p>
                        <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#111827;">${data.date}</p>
                      </td>
                      <td width="50%">
                        <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Horário</p>
                        <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#111827;">${data.time} · ${durationLabel}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ${data.meetUrl ? `
              <tr>
                <td style="padding:14px 20px;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Link da reunião</p>
                  <a href="${data.meetUrl}" style="display:inline-block;margin-top:8px;padding:10px 22px;background:#407b75;color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
                    Entrar no Google Meet
                  </a>
                </td>
              </tr>` : ""}
            </table>

            <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
              Caso tenha alguma dúvida, entre em contato com nossa equipe.
            </p>
          </td>
        </tr>
        ${logoFooterHtml}
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return resend.emails.send({
    from,
    to: allRecipients,
    cc: [ALWAYS_CC],
    subject: `Reunião agendada: ${data.meetingTitle} — ${data.date} às ${data.time}`,
    html,
    attachments: [logoAttachment],
  });
}

function section(title: string, rows: string[]): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);">
      <tr>
        <td style="background:rgba(64,123,117,0.15);padding:10px 16px;">
          <p style="margin:0;font-size:11px;font-weight:600;color:#5bbfb5;text-transform:uppercase;letter-spacing:1.5px;">${title}</p>
        </td>
      </tr>
      ${rows.join("")}
    </table>
  `;
}

function row(label: string, value: string): string {
  const empty = value === "—";
  return `
    <tr>
      <td style="padding:10px 16px;border-top:1px solid rgba(255,255,255,0.05);">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:rgba(255,255,255,0.55);font-size:13px;">${label}</td>
            <td align="right" style="color:${empty ? "rgba(255,255,255,0.2)" : "#fff"};font-size:13px;font-weight:${empty ? "400" : "600"};">${value}</td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}
