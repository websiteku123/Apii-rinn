document.addEventListener('DOMContentLoaded', async () => {
    const loadingScreen = document.getElementById("loadingScreen");
    const body = document.body;
    body.classList.add("no-scroll");

    const loadingDotsAnimation = setInterval(() => {
        const loadingDots = document.querySelector(".loading-dots");
        if (loadingDots) {
            if (loadingDots.textContent === '...') {
                loadingDots.textContent = '.';
            } else {
                loadingDots.textContent += '.';
            }
        }
    }, 500);

    const sideNav = document.querySelector('.side-nav');
    const mainWrapper = document.querySelector('.main-wrapper');
    const navCollapseBtn = document.querySelector('.nav-collapse-btn');
    const menuToggle = document.querySelector('.menu-toggle');

    if (navCollapseBtn) {
        navCollapseBtn.addEventListener('click', () => {
            sideNav.classList.toggle('collapsed');
            mainWrapper.classList.toggle('nav-collapsed');
        });
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sideNav.classList.toggle('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (window.innerWidth < 992 && 
            sideNav &&
            !e.target.closest('.side-nav') && 
            !e.target.closest('.menu-toggle') && 
            sideNav.classList.contains('active')) {
            sideNav.classList.remove('active');
        }
    });

    document.querySelectorAll('.side-nav-link').forEach(link => {
        if (link.getAttribute('href').startsWith('#')) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);

                if (targetElement) {
                    targetElement.scrollIntoView({ 
                        behavior: 'smooth' 
                    });

                    document.querySelectorAll('.side-nav-link').forEach(l => {
                        l.classList.remove('active');
                    });
                    this.classList.add('active');

                    if (window.innerWidth < 992 && sideNav) {
                        sideNav.classList.remove('active');
                    }
                }
            });
        }
    });

    window.addEventListener('scroll', () => {
        const scrollPosition = window.scrollY;

        document.querySelectorAll('section[id]').forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                document.querySelectorAll('.side-nav-link').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });

    const showToast = (message, type = 'info') => {
        const toast = document.getElementById('notificationToast');
        if (!toast) return;
        const toastBody = toast.querySelector('.toast-body');
        const toastTitle = toast.querySelector('.toast-title');
        const toastIcon = toast.querySelector('.toast-icon');

        if (toastBody) toastBody.textContent = message;

        toast.style.borderLeftColor = type === 'success' 
            ? 'var(--success-color)' 
            : type === 'error' 
                ? 'var(--error-color)' 
                : 'var(--primary-color)';

        if (toastIcon) {
            toastIcon.className = `toast-icon fas fa-${
                type === 'success' 
                    ? 'check-circle' 
                    : type === 'error' 
                        ? 'exclamation-circle' 
                        : 'info-circle'
            } me-2`;

            toastIcon.style.color = type === 'success' 
                ? 'var(--success-color)' 
                : type === 'error' 
                    ? 'var(--error-color)' 
                    : 'var(--primary-color)';
        }

        if (toastTitle) toastTitle.textContent = type.charAt(0).toUpperCase() + type.slice(1);

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    };

    const themeToggle = document.getElementById('themeToggle');

    if (themeToggle) {
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            themeToggle.checked = true;
        }

        themeToggle.addEventListener('change', () => {
            document.body.classList.toggle('dark-mode');
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDarkMode);
            showToast(`Switched to ${isDarkMode ? 'dark' : 'light'} mode`, 'success');
        });
    }

    const clearSearchBtnMain = document.getElementById('clearSearch');
    if (clearSearchBtnMain) {
        clearSearchBtnMain.addEventListener('click', () => {
            const searchInput = document.getElementById('searchInput');
            if (searchInput && searchInput.value.length > 0) {
                searchInput.value = '';
                searchInput.focus();
                searchInput.dispatchEvent(new Event('input'));
                searchInput.classList.add('shake-animation');
                setTimeout(() => {
                    searchInput.classList.remove('shake-animation');
                }, 400);
            }
        });
    }

    const copyToClipboard = (elementId) => {
        const element = document.getElementById(elementId);
        if (!element) return;
        const text = element.textContent;

        navigator.clipboard.writeText(text).then(() => {
            const btn = elementId === 'apiEndpoint' ? 
                document.getElementById('copyEndpoint') : 
                document.getElementById('copyResponse');

            if (btn) {
                btn.innerHTML = '<i class="fas fa-check"></i>';
                btn.classList.add('copy-success');
            }

            showToast('Copied to clipboard successfully!', 'success');

            setTimeout(() => {
                if (btn) {
                    btn.innerHTML = '<i class="far fa-copy"></i>';
                    btn.classList.remove('copy-success');
                }
            }, 1500);
        }).catch(err => {
            showToast('Failed to copy text: ' + err, 'error');
        });
    };

    const copyEndpointBtn = document.getElementById('copyEndpoint');
    if (copyEndpointBtn) {
        copyEndpointBtn.addEventListener('click', () => {
            copyToClipboard('apiEndpoint');
        });
    }

    const copyResponseBtn = document.getElementById('copyResponse');
    if (copyResponseBtn) {
        copyResponseBtn.addEventListener('click', () => {
            copyToClipboard('apiResponseContent');
        });
    }

    try {
        const response = await fetch('/openapi.json');
        if (!response.ok) {
            throw new Error(`Failed to load openapi.json: ${response.status} ${response.statusText}`);
        }

        const openApiData = await response.json();
        const routes = openApiData.routes || [];

        const setContent = (id, property, value, fallback = '') => {
            const element = document.getElementById(id);
            if (element) element[property] = value || fallback;
        };

        const currentYear = new Date().getFullYear();
        const creator = openApiData.creator || 'Rin api';

        setContent('page', 'textContent', creator, "API");
        setContent('header', 'textContent', creator, "API");
        setContent('name', 'textContent', creator, "API");
        setContent('sideNavName', 'textContent', creator);
        setContent('version', 'textContent', 'v1.0', "v1.0");
        setContent('versionHeader', 'textContent', 'Active!', "Active!");

        const fullDescription = "Selamat datang di platform layanan rest-api premium. Menyediakan endpoint berkecepatan tinggi yang stabil, aman, mudah diintegrasikan untuk kebutuhan bot WhatsApp, aplikasi web, tools otomatisasi, data downloader, maupun manajemen media sosial secara realtime.";
        setContent('description', 'textContent', fullDescription);

        const watermarkElement = document.getElementById('wm');
        if (watermarkElement) {
            watermarkElement.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; width: 100%; text-align: center;">
                    <p style="margin: 0; font-size: 14px; font-weight: 500; letter-spacing: 0.5px;">
                        <i class="fas fa-copyright" style="color: var(--primary-color);"></i> ${currentYear} <strong>${creator}</strong>. All rights reserved.
                    </p>
                    <p style="margin: 0 0 10px 0; font-size: 12px; color: var(--text-muted); max-width: 500px; line-height: 1.6;">
                        <i class="fas fa-info-circle"></i> Diproduksi secara profesional untuk memberikan performa API terbaik secara instan, fleksibel, serta efisiensi integrasi tanpa batas.
                    </p>
                </div>
            `;
        }

        const dynamicImage = document.getElementById('dynamicImage');
        if (dynamicImage) {
            dynamicImage.src = '/src/banner.jpg';
            dynamicImage.onerror = () => {
                dynamicImage.src = '/api/src/banner.jpg';
                showToast('Failed to load banner image, using default', 'error');
            };
            dynamicImage.onload = () => {
                dynamicImage.classList.add('fade-in');
            };
        }

        const apiLinksContainer = document.getElementById('apiLinks');
        if (apiLinksContainer) {
            apiLinksContainer.innerHTML = '';
        }

        const apiContent = document.getElementById('apiContent');

        if (apiContent) {
            if (!routes.length) {
                apiContent.innerHTML = `
                    <div class="no-results-message">
                        <i class="fas fa-database"></i>
                        <p>No API routes found</p>
                        <button class="btn btn-primary" onclick="location.reload()">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                `;
            } else {
                const categories = {};
                routes.forEach(route => {
                    const category = route.category || 'Uncategorized';
                    if (!categories[category]) {
                        categories[category] = [];
                    }
                    categories[category].push(route);
                });

                Object.keys(categories).forEach((categoryName, catIndex) => {
                    const sortedItems = categories[categoryName].sort((a, b) => a.path.localeCompare(b.path));

                    const categoryElement = document.createElement('div');
                    categoryElement.className = 'category-section';
                    categoryElement.style.animationDelay = `${catIndex * 0.2}s`;

                    const categoryHeader = document.createElement('h3');
                    categoryHeader.className = 'category-header';
                    categoryHeader.textContent = categoryName;
                    categoryElement.appendChild(categoryHeader);

                    const itemsRow = document.createElement('div');
                    itemsRow.className = 'row';

                    sortedItems.forEach((item, index) => {
                        const itemCol = document.createElement('div');
                        itemCol.className = 'col-md-6 col-lg-4 api-item mb-3'; 
                        itemCol.dataset.name = item.path;
                        itemCol.dataset.desc = item.description || '';
                        itemCol.dataset.category = categoryName;
                        itemCol.style.animationDelay = `${index * 0.05 + 0.3}s`;

                        // Desain card kotak mewah mengikuti referensi gambar kanan user
                        const heroSection = document.createElement('div');
                        heroSection.className = 'hero-section';
                        heroSection.style.display = 'flex';
                        heroSection.style.flexDirection = 'column';
                        heroSection.style.justifyContent = 'space-between';
                        heroSection.style.padding = '16px';
                        heroSection.style.borderRadius = '8px';
                        heroSection.style.border = '1px solid rgba(255, 255, 255, 0.08)';
                        heroSection.style.background = 'rgba(255, 255, 255, 0.02)';
                        heroSection.style.backdropFilter = 'blur(10px)';
                        heroSection.style.height = '100%';
                        heroSection.style.minHeight = '140px';

                        const infoDiv = document.createElement('div');
                        infoDiv.className = 'w-100';

                        // Area Header Card: Badge Method + Path berdampingan rapi
                        const headerLayout = document.createElement('div');
                        headerLayout.style.display = 'flex';
                        headerLayout.style.alignItems = 'center';
                        headerLayout.style.gap = '8px';
                        headerLayout.style.marginBottom = '12px';

                        const methodBadge = document.createElement('span');
                        const isGet = item.method.toUpperCase() === 'GET';
                        methodBadge.textContent = item.method.toUpperCase();
                        methodBadge.style.background = isGet ? 'rgba(0, 200, 83, 0.15)' : 'rgba(255, 145, 0, 0.15)';
                        methodBadge.style.color = isGet ? '#00c853' : '#ff9100';
                        methodBadge.style.padding = '3px 8px';
                        methodBadge.style.borderRadius = '4px';
                        methodBadge.style.fontSize = '11px';
                        methodBadge.style.fontWeight = 'bold';
                        methodBadge.style.border = `1px solid ${isGet ? 'rgba(0, 200, 83, 0.3)' : 'rgba(255, 145, 0, 0.3)'}`;

                        const itemTitle = document.createElement('span');
                        itemTitle.style.fontSize = '14px';
                        itemTitle.style.fontWeight = '600';
                        itemTitle.style.color = 'var(--text-color)';
                        itemTitle.style.whiteSpace = 'nowrap';
                        itemTitle.style.overflow = 'hidden';
                        itemTitle.style.textOverflow = 'ellipsis';
                        itemTitle.textContent = item.path;

                        headerLayout.appendChild(methodBadge);
                        headerLayout.appendChild(itemTitle);

                        // Body Card: FIX Sesuai Request, menampilkan isi deskripsi asli API secara penuh
                        const itemDesc = document.createElement('p');
                        itemDesc.className = 'text-muted mb-0';
                        itemDesc.style.fontSize = '13px';
                        itemDesc.style.lineHeight = '1.5';
                        itemDesc.style.display = '-webkit-box';
                        itemDesc.style.webkitLineClamp = '2';
                        itemDesc.style.webkitBoxOrient = 'vertical';
                        itemDesc.style.overflow = 'hidden';
                        itemDesc.textContent = item.description || 'No description available for this endpoint.';

                        infoDiv.appendChild(headerLayout);
                        infoDiv.appendChild(itemDesc);

                        // Footer Card: Baris status & tombol test persegi panjang mini
                        const actionsDiv = document.createElement('div');
                        actionsDiv.className = 'api-actions';
                        actionsDiv.style.display = 'flex';
                        actionsDiv.style.justifyContent = 'space-between';
                        actionsDiv.style.alignItems = 'center';
                        actionsDiv.style.marginTop = '14px';
                        actionsDiv.style.width = '100%';

                        const statusIndicator = document.createElement('div');
                        statusIndicator.style.display = 'flex';
                        statusIndicator.style.alignItems = 'center';
                        statusIndicator.style.gap = '6px';

                        const icon = document.createElement('i');
                        icon.className = 'fas fa-circle';
                        icon.style.color = '#00c853'; 
                        icon.style.fontSize = '8px';
                        statusIndicator.appendChild(icon);

                        const statusText = document.createElement('span');
                        statusText.textContent = 'active';
                        statusText.style.color = '#00c853';
                        statusText.style.fontSize = '12px';
                        statusText.style.fontWeight = '500';
                        statusIndicator.appendChild(statusText);

                        const getBtn = document.createElement('button');
                        getBtn.className = 'btn get-api-btn';
                        getBtn.innerHTML = '<i class="fas fa-terminal" style="font-size: 10px;"></i> TEST';
                        getBtn.dataset.apiPath = item.path;
                        getBtn.dataset.apiMethod = item.method;
                        getBtn.dataset.apiName = `${item.method} ${item.path}`;
                        getBtn.dataset.apiDesc = item.description || '';
                        getBtn.setAttribute('aria-label', `Get ${item.method} ${item.path}`);
                        
                        getBtn.style.padding = '4px 12px';
                        getBtn.style.borderRadius = '4px'; 
                        getBtn.style.fontSize = '11px';
                        getBtn.style.fontWeight = '600';
                        getBtn.style.height = '28px';
                        getBtn.style.display = 'inline-flex';
                        getBtn.style.alignItems = 'center';
                        getBtn.style.gap = '5px';

                        actionsDiv.appendChild(statusIndicator);
                        actionsDiv.appendChild(getBtn);

                        heroSection.appendChild(infoDiv);
                        heroSection.appendChild(actionsDiv);

                        itemCol.appendChild(heroSection);
                        itemsRow.appendChild(itemCol);
                    });

                    categoryElement.appendChild(itemsRow);
                    apiContent.appendChild(categoryElement);
                });
            }
        }

        const searchInput = document.getElementById('searchInput');
        const clearSearchBtn = document.getElementById('clearSearch');

        if (searchInput && clearSearchBtn) {
            searchInput.addEventListener('focus', () => {
                searchInput.parentElement.classList.add('search-focused');
            });

            searchInput.addEventListener('blur', () => {
                searchInput.parentElement.classList.remove('search-focused');
            });

            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase();

                if (searchTerm.length > 0) {
                    clearSearchBtn.style.opacity = '1';
                    clearSearchBtn.style.pointerEvents = 'auto';
                } else {
                    clearSearchBtn.style.opacity = '0';
                    clearSearchBtn.style.pointerEvents = 'none';
                }

                const apiItems = document.querySelectorAll('.api-item');
                const categoryHeaders = document.querySelectorAll('.category-header');
                const categoryImages = document.querySelectorAll('.category-image');
                const categoryCount = {};

                apiItems.forEach(item => {
                    const name = item.getAttribute('data-name').toLowerCase();
                    const desc = item.getAttribute('data-desc').toLowerCase();
                    const category = item.getAttribute('data-category').toLowerCase();

                    const matchesSearch = name.includes(searchTerm) || 
                                         desc.includes(searchTerm) || 
                                         category.includes(searchTerm);

                    if (matchesSearch) {
                        item.style.display = '';
                        if (searchTerm !== '') {
                            item.classList.add('search-match');
                            setTimeout(() => item.classList.remove('search-match'), 800);
                        }

                        if (!categoryCount[category]) {
                            categoryCount[category] = 0;
                        }
                        categoryCount[category]++;
                    } else {
                        item.style.display = 'none';
                    }
                });

                categoryHeaders.forEach((header, index) => {
                    const categorySection = header.closest('.category-section');
                    const categoryName = header.textContent.toLowerCase();

                    if (categorySection) {
                        if (categoryCount[categoryName] > 0) {
                            categorySection.style.display = '';
                            if (categoryImages[index]) {
                                categoryImages[index].style.display = '';
                            }

                            if (searchTerm.length > 0) {
                                let countBadge = header.querySelector('.count-badge');
                                if (!countBadge) {
                                    countBadge = document.createElement('span');
                                    countBadge.className = 'count-badge';
                                    countBadge.style.fontSize = '14px';
                                    countBadge.style.marginLeft = '10px';
                                    countBadge.style.fontWeight = 'normal';
                                    countBadge.style.color = 'var(--text-muted)';
                                    header.appendChild(countBadge);
                                }
                                countBadge.textContent = `(${categoryCount[categoryName]} results)`;
                            } else {
                                const countBadge = header.querySelector('.count-badge');
                                if (countBadge) {
                                    header.removeChild(countBadge);
                                }
                            }
                        } else {
                            categorySection.style.display = 'none';
                            if (categoryImages[index]) {
                                categoryImages[index].style.display = 'none';
                            }
                        }
                    }
                });

                let noResultsMsg = document.getElementById('noResultsMessage');

                const noVisibleSections = Array.from(document.querySelectorAll('.category-section')).every(
                    section => section.style.display === 'none'
                );

                if (noVisibleSections && searchTerm.length > 0 && apiContent) {
                    if (!noResultsMsg) {
                        noResultsMsg = document.createElement('div');
                        noResultsMsg.id = 'noResultsMessage';
                        noResultsMsg.className = 'no-results-message fade-in';
                        noResultsMsg.innerHTML = `
                            <i class="fas fa-search"></i>
                            <p>No results found for "<span>${searchTerm}</span>"</p>
                            <button id="clearSearchFromMsg" class="btn btn-primary">
                                <i class="fas fa-times"></i> Clear Search
                            </button>
                        `;
                        apiContent.appendChild(noResultsMsg);

                        document.getElementById('clearSearchFromMsg').addEventListener('click', () => {
                            searchInput.value = '';
                            searchInput.dispatchEvent(new Event('input'));
                            searchInput.focus();
                        });
                    } else {
                        noResultsMsg.querySelector('span').textContent = searchTerm;
                        noResultsMsg.style.display = 'flex';
                    }
                } else if (noResultsMsg) {
                    noResultsMsg.style.display = 'none';
                }
            });
        }

        // FIX UTAMA: Handler click murni dipasang di dokumen root, hanya menembak API saat tombol beneran diklik user!
        document.addEventListener('click', event => {
            const getApiBtn = event.target.closest('.get-api-btn');
            if (!getApiBtn) return;

            getApiBtn.classList.add('pulse-animation');
            setTimeout(() => {
                getApiBtn.classList.remove('pulse-animation');
            }, 300);

            const { apiPath, apiMethod, apiName, apiDesc } = getApiBtn.dataset;
            const modal = new bootstrap.Modal(document.getElementById('apiResponseModal'));
            const modalRefs = {
                label: document.getElementById('apiResponseModalLabel'),
                desc: document.getElementById('apiResponseModalDesc'),
                content: document.getElementById('apiResponseContent'),
                container: document.getElementById('responseContainer'),
                endpoint: document.getElementById('apiEndpoint'),
                spinner: document.getElementById('apiResponseLoading'),
                queryInputContainer: document.getElementById('apiQueryInputContainer'),
                submitBtn: document.getElementById('submitQueryBtn')
            };

            if (modalRefs.label) modalRefs.label.textContent = apiName;
            if (modalRefs.desc) modalRefs.desc.textContent = apiDesc;
            if (modalRefs.content) modalRefs.content.textContent = '';
            if (modalRefs.endpoint) modalRefs.endpoint.textContent = '';
            if (modalRefs.spinner) modalRefs.spinner.classList.add('d-none');
            if (modalRefs.content) modalRefs.content.classList.add('d-none');
            if (modalRefs.container) modalRefs.container.classList.add('d-none');
            if (modalRefs.endpoint) modalRefs.endpoint.classList.add('d-none');

            if (modalRefs.queryInputContainer) modalRefs.queryInputContainer.innerHTML = '';
            if (modalRefs.submitBtn) {
                modalRefs.submitBtn.classList.add('d-none');
                modalRefs.submitBtn.disabled = true;
                modalRefs.submitBtn.classList.remove('btn-active');
            }

            const currentRoute = routes.find(route => route.path === apiPath && route.method.toLowerCase() === apiMethod.toLowerCase());
            const parameters = currentRoute?.parameters || [];
            const isApikey = currentRoute?.isApikey || false;
            const hasParams = parameters.length > 0;

            const paramContainer = document.createElement('div');
            paramContainer.className = 'param-container';

            if (isApikey) {
                const apiKeyGroup = document.createElement('div');
                apiKeyGroup.className = 'mb-3 param-group';

                const labelContainer = document.createElement('div');
                labelContainer.className = 'param-label-container';

                const label = document.createElement('label');
                label.className = 'form-label';
                label.textContent = 'API Key';
                label.htmlFor = 'api-key-input';

                const requiredSpan = document.createElement('span');
                requiredSpan.className = 'required-indicator';
                requiredSpan.textContent = '*';
                label.appendChild(requiredSpan);
                labelContainer.appendChild(label);

                const tooltipIcon = document.createElement('i');
                tooltipIcon.className = 'fas fa-info-circle param-info';
                tooltipIcon.setAttribute('data-bs-toggle', 'tooltip');
                tooltipIcon.setAttribute('data-bs-placement', 'top');
                tooltipIcon.title = 'API Key required for this endpoint';
                labelContainer.appendChild(tooltipIcon);

                apiKeyGroup.appendChild(labelContainer);

                const inputContainer = document.createElement('div');
                inputContainer.className = 'input-container';

                const inputField = document.createElement('input');
                inputField.type = 'password';
                inputField.className = 'form-control custom-input';
                inputField.id = 'api-key-input';
                inputField.placeholder = 'Enter API Key...';
                inputField.dataset.param = 'x-api-key';
                inputField.required = true;
                inputField.autocomplete = "off";

                inputField.addEventListener('focus', () => {
                    inputContainer.classList.add('input-focused');
                });

                inputField.addEventListener('blur', () => {
                    inputContainer.classList.remove('input-focused');
                    if (!inputField.value.trim()) {
                        inputField.classList.add('is-invalid');
                    } else {
                        inputField.classList.remove('is-invalid');
                    }
                });

                inputField.addEventListener('input', validateInputs);

                inputContainer.appendChild(inputField);
                apiKeyGroup.appendChild(inputContainer);
                paramContainer.appendChild(apiKeyGroup);
            }

            if (hasParams) {
                const formTitle = document.createElement('h6');
                formTitle.className = 'param-form-title';
                formTitle.innerHTML = '<i class="fas fa-sliders-h"></i> Parameters';
                paramContainer.appendChild(formTitle);

                parameters.forEach((param, index) => {
                    const isRequired = param.required !== false;
                    const paramGroup = document.createElement('div');
                    paramGroup.className = index < parameters.length - 1 ? 'mb-3 param-group' : 'param-group';

                    const labelContainer = document.createElement('div');
                    labelContainer.className = 'param-label-container';

                    const label = document.createElement('label');
                    label.className = 'form-label';
                    label.textContent = param.name;
                    label.htmlFor = `param-${param.name}`;

                    if (isRequired) {
                        const requiredSpan = document.createElement('span');
                        requiredSpan.className = 'required-indicator';
                        requiredSpan.textContent = '*';
                        label.appendChild(requiredSpan);
                    }

                    labelContainer.appendChild(label);

                    if (param.description) {
                        const tooltipIcon = document.createElement('i');
                        tooltipIcon.className = 'fas fa-info-circle param-info';
                        tooltipIcon.setAttribute('data-bs-toggle', 'tooltip');
                        tooltipIcon.setAttribute('data-bs-placement', 'top');
                        tooltipIcon.title = param.description;
                        labelContainer.appendChild(tooltipIcon);
                    }

                    paramGroup.appendChild(labelContainer);

                    const inputContainer = document.createElement('div');
                    inputContainer.className = 'input-container';

                    const inputField = document.createElement('input');
                    inputField.type = 'text';
                    inputField.className = 'form-control custom-input';
                    inputField.id = `param-${param.name}`;
                    inputField.placeholder = `Enter ${param.name}...`;
                    inputField.dataset.param = param.name;
                    if (isRequired) {
                        inputField.required = true;
                    }
                    inputField.autocomplete = "off";

                    inputField.addEventListener('focus', () => {
                        inputContainer.classList.add('input-focused');
                    });

                    inputField.addEventListener('blur', () => {
                        inputContainer.classList.remove('input-focused');
                        if (isRequired && !inputField.value.trim()) {
                            inputField.classList.add('is-invalid');
                        } else {
                            inputField.classList.remove('is-invalid');
                        }
                    });

                    inputField.addEventListener('input', validateInputs);

                    inputContainer.appendChild(inputField);
                    paramGroup.appendChild(inputContainer);
                    paramContainer.appendChild(paramGroup);
                });
            }

            if (currentRoute?.description && !hasParams && !isApikey) {
                const innerDescDiv = document.createElement('div');
                innerDescDiv.className = 'inner-desc';
                innerDescDiv.innerHTML = `<i class="fas fa-info-circle"></i> ${currentRoute.description.replace(/\n/g, '<br>')}`;
                paramContainer.appendChild(innerDescDiv);
            }

            if (hasParams || isApikey) {
                modalRefs.queryInputContainer.appendChild(paramContainer);
                modalRefs.submitBtn.classList.remove('d-none');

                modalRefs.submitBtn.onclick = async () => {
                    const inputs = modalRefs.queryInputContainer.querySelectorAll('input');
                    const newParams = new URLSearchParams();
                    let apiKeyValue = '';
                    let isValid = true;

                    inputs.forEach(input => {
                        const isRequired = input.required;
                        if (isRequired && !input.value.trim()) {
                            isValid = false;
                            input.classList.add('is-invalid');
                            input.parentElement.classList.add('shake-animation');
                            setTimeout(() => {
                                input.parentElement.classList.remove('shake-animation');
                            }, 500);
                        } else {
                            input.classList.remove('is-invalid');
                            if (input.value.trim()) {
                                if (input.dataset.param === 'x-api-key') {
                                    apiKeyValue = input.value.trim();
                                } else {
                                    newParams.append(input.dataset.param, input.value.trim());
                                }
                            }
                        }
                    });

                    if (!isValid) {
                        const errorMsg = document.createElement('div');
                        errorMsg.className = 'alert alert-danger mt-3 fade-in';
                        errorMsg.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please fill in all required fields.';

                        const existingError = modalRefs.queryInputContainer.querySelector('.alert');
                        if (existingError) existingError.remove();

                        modalRefs.queryInputContainer.appendChild(errorMsg);

                        modalRefs.submitBtn.classList.add('shake-animation');
                        setTimeout(() => {
                            modalRefs.submitBtn.classList.remove('shake-animation');
                        }, 500);

                        return;
                    }

                    modalRefs.submitBtn.disabled = true;
                    modalRefs.submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';

                    const basePath = apiPath.split('?')[0];
                    let apiUrlWithParams = `${window.location.origin}${basePath}`;
                    const queryString = newParams.toString();
                    if (queryString) {
                        apiUrlWithParams += `?${queryString}`;
                    }

                    modalRefs.queryInputContainer.style.opacity = '0';
                    setTimeout(() => {
                        modalRefs.queryInputContainer.innerHTML = '';
                        modalRefs.queryInputContainer.style.opacity = '1';
                        modalRefs.submitBtn.classList.add('d-none');
                        handleApiRequest(apiUrlWithParams, modalRefs, apiName, apiKeyValue);
                    }, 300);
                };

                const tooltips = modalRefs.queryInputContainer.querySelectorAll('[data-bs-toggle="tooltip"]');
                tooltips.forEach(tooltip => {
                    new bootstrap.Tooltip(tooltip);
                });
            } else {
                const baseUrl = `${window.location.origin}${apiPath}`;
                handleApiRequest(baseUrl, modalRefs, apiName, '');
            }

            modal.show();
        });

        function validateInputs() {
            const submitBtn = document.getElementById('submitQueryBtn');
            const inputs = document.querySelectorAll('.param-container input');
            const requiredInputs = Array.from(inputs).filter(input => input.required);
            const isValid = requiredInputs.every(input => input.value.trim() !== '');

            if (submitBtn) {
                if (isValid) {
                    submitBtn.disabled = false;
                    submitBtn.classList.add('btn-active');
                } else {
                    submitBtn.disabled = true;
                    submitBtn.classList.remove('btn-active');
                }
            }

            this.classList.remove('is-invalid');

            const errorMsg = document.querySelector('.alert.alert-danger');
            if (errorMsg && this.value.trim() !== '') {
                errorMsg.classList.add('fade-out');
                setTimeout(() => errorMsg.remove(), 300);
            }
        }

        async function handleApiRequest(apiUrl, modalRefs, apiName) {
            if (modalRefs.spinner) modalRefs.spinner.classList.remove('d-none');
            if (modalRefs.container) modalRefs.container.classList.add('d-none');

            if (modalRefs.endpoint) {
                modalRefs.endpoint.textContent = '';
                modalRefs.endpoint.classList.remove('d-none');
            }

            const typingSpeed = 20;
            const endpointText = apiUrl;
            let charIndex = 0;

            const typeEndpoint = () => {
                if (modalRefs.endpoint && charIndex < endpointText.length) {
                    modalRefs.endpoint.textContent += endpointText.charAt(charIndex);
                    charIndex++;
                    setTimeout(typeEndpoint, typingSpeed);
                }
            };

            typeEndpoint();

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);

                const response = await fetch(apiUrl, { 
                    signal: controller.signal 
                }).catch(error => {
                    if (error.name === 'AbortError') {
                        throw new Error('Request timed out. Please try again.');
                    }
                    throw error;
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} - ${response.statusText || 'Unknown error'}`);
                }

                const contentType = response.headers.get('Content-Type');
                if (contentType && contentType.startsWith('image/')) {
                    const blob = await response.blob();
                    const imageUrl = URL.createObjectURL(blob);

                    const img = document.createElement('img');
                    img.src = imageUrl;
                    img.alt = apiName;
                    img.className = 'response-image fade-in';
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                    img.style.borderRadius = 'var(--border-radius)';
                    img.style.boxShadow = 'var(--shadow)';
                    img.style.transition = 'var(--transition)';

                    img.onmouseover = () => {
                        img.style.transform = 'scale(1.02)';
                        img.style.boxShadow = 'var(--hover-shadow)';
                    };

                    img.onmouseout = () => {
                        img.style.transform = 'scale(1)';
                        img.style.boxShadow = 'var(--shadow)';
                    };

                    if (modalRefs.content) {
                        modalRefs.content.innerHTML = '';
                        modalRefs.content.appendChild(img);
                    }

                    const downloadBtn = document.createElement('button');
                    downloadBtn.className = 'btn btn-primary mt-3';
                    downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download Image';
                    downloadBtn.style.width = '100%';

                    downloadBtn.onclick = () => {
                        const link = document.createElement('a');
                        link.href = imageUrl;
                        link.download = `${apiName.toLowerCase().replace(/\s+/g, '-')}.${blob.type.split('/')[1]}`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        showToast('Image download started!', 'success');
                    };

                    if (modalRefs.content) modalRefs.content.appendChild(downloadBtn);
                } else {
                    const data = await response.json();
                    const formattedJson = syntaxHighlight(JSON.stringify(data, null, 2));
                    if (modalRefs.content) {
                        modalRefs.content.innerHTML = formattedJson;

                        if (JSON.stringify(data, null, 2).split('\n').length > 15) {
                            addCodeFolding(modalRefs.content);
                        }
                    }
                }

                if (modalRefs.container) {
                    modalRefs.container.classList.remove('d-none');
                    modalRefs.container.classList.add('slide-in-bottom');
                }
                if (modalRefs.content) modalRefs.content.classList.remove('d-none');
                showToast(`Successfully retrieved ${apiName}`, 'success');
            } catch (error) {
                const errorContainer = document.createElement('div');
                errorContainer.className = 'error-container fade-in';

                const errorIcon = document.createElement('div');
                errorIcon.className = 'error-icon';
                errorIcon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';

                const errorMessage = document.createElement('div');
                errorMessage.className = 'error-message';
                errorMessage.innerHTML = `
                    <h6>Error Occurred</h6>
                    <p>${error.message}</p>
                    <div class="mt-2">
                        <button class="btn btn-sm retry-btn">
                            <i class="fas fa-sync-alt"></i> Retry Request
                        </button>
                    </div>
                `;

                errorContainer.appendChild(errorIcon);
                errorContainer.appendChild(errorMessage);

                if (modalRefs.content) {
                    modalRefs.content.innerHTML = '';
                    modalRefs.content.appendChild(errorContainer);
                    modalRefs.content.classList.remove('d-none');
                }
                if (modalRefs.container) modalRefs.container.classList.remove('d-none');

                const retryBtn = errorContainer.querySelector('.retry-btn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', () => {
                        if (modalRefs.content) modalRefs.content.classList.add('d-none');
                        if (modalRefs.container) modalRefs.container.classList.add('d-none');
                        handleApiRequest(apiUrl, modalRefs, apiName);
                    });
                }

                showToast('Error retrieving data. Check response for details.', 'error');
            } finally {
                if (modalRefs.spinner) modalRefs.spinner.classList.add('d-none');
            }
        }

        function addCodeFolding(container) {
            const codeLines = container.innerHTML.split('\n');
            let foldableContent = '';
            let inObject = false;
            let objectLevel = 0;

            for (let i = 0; i < codeLines.length; i++) {
                const line = codeLines[i];

                if (line.includes('{') && !line.includes('}')) {
                    if (!inObject) {
                        foldableContent += `<div class="code-fold-trigger" data-folded="false">${line}</div>`;
                        foldableContent += '<div class="code-fold-content">';
                        inObject = true;
                        objectLevel = 1;
                    } else {
                        foldableContent += line + '\n';
                        objectLevel++;
                    }
                } else if (line.includes('}') && !line.includes('{')) {
                    objectLevel--;
                    if (objectLevel === 0 && inObject) {
                        foldableContent += line + '\n';
                        foldableContent += '</div>';
                        inObject = false;
                    } else {
                        foldableContent += line + '\n';
                    }
                } else {
                    foldableContent += line + '\n';
                }
            }

            container.innerHTML = foldableContent;

            const foldTriggers = container.querySelectorAll('.code-fold-trigger');
            foldTriggers.forEach(trigger => {
                trigger.addEventListener('click', () => {
                    const isFolded = trigger.getAttribute('data-folded') === 'true';
                    const content = trigger.nextElementSibling;

                    if (isFolded) {
                        content.style.maxHeight = '0';
                        content.style.display = 'block';
                        setTimeout(() => {
                            content.style.maxHeight = content.scrollHeight + 'px';
                            trigger.setAttribute('data-folded', 'false');
                            trigger.classList.remove('folded');
                        }, 10);

                        setTimeout(() => {
                            content.style.maxHeight = '';
                        }, 300);
                    } else {
                        content.style.maxHeight = content.scrollHeight + 'px';
                        setTimeout(() => {
                            content.style.maxHeight = '0';
                        }, 10);

                        setTimeout(() => {
                            content.style.display = 'none';
                            trigger.setAttribute('data-folded', 'true');
                            trigger.classList.add('folded');
                        }, 300);
                    }
                });

                if (trigger.nextElementSibling && trigger.nextElementSibling.classList.contains('code-fold-content')) {
                    const lineCount = trigger.nextElementSibling.innerHTML.split('\n').length - 1;
                    const foldIndicator = document.createElement('span');
                    foldIndicator.className = 'fold-indicator';
                    foldIndicator.innerHTML = `<i class="fas fa-chevron-down"></i> ${lineCount} lines`;
                    trigger.appendChild(foldIndicator);
                }
            });
        }

        function syntaxHighlight(json) {
            json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                let cls = 'json-number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'json-key';
                    } else {
                        cls = 'json-string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'json-boolean';
                } else if (/null/.test(match)) {
                    cls = 'json-null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            });
        }

        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function (tooltipTriggerEl) {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });

        const notificationBell = document.querySelector('.notification-bell');
        if (notificationBell) {
            notificationBell.addEventListener('click', () => {
                showToast('2 new updates available', 'info');
            });
        }

    } catch (error) {
        console.error('Error loading openapi.json:', error);
        showToast(`Failed to load openapi.json: ${error.message}`, 'error');
    } finally {
        clearInterval(loadingDotsAnimation);
        setTimeout(() => {
            if (loadingScreen) loadingScreen.classList.add('fade-out');

            setTimeout(() => {
                if (loadingScreen) loadingScreen.style.display = "none";
                body.classList.remove("no-scroll");
            }, 500);
        }, 1000);
    }

    const observeElements = () => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1
        });

        document.querySelectorAll('.api-item:not(.in-view)').forEach(item => {
            observer.observe(item);
        });
    };

    observeElements();
    window.addEventListener('resize', observeElements);
});
